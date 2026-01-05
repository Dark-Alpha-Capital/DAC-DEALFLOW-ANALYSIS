import { Job, FlowJob } from "bullmq";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import db, { Sentiment, deals, screeners, aiScreenings, eq, and } from "db";
import { openai } from "../../lib/ai/available-models";
import { splitContentIntoChunks } from "../../lib/utils";
import { QUEUE_NAMES } from "../../lib/queues";
import { FLOW_QUEUE_NAMES, FLOW_DEFAULT_JOB_OPTIONS, FLOW_STEP_COUNTS } from "../../lib/flow-queues";
import {
  generateIdempotencyKey,
  withIdempotency,
} from "../../lib/idempotency";

// ============================================================================
// Types
// ============================================================================

export interface ScreenDealFlowData {
  dealId: string;
  screenerId: string;
  userId: string;
  jobId: string;
}

export interface FetchDataResult {
  deal: {
    id: string;
    title: string | null;
    dealCaption: string | null;
    dealTeaser: string | null;
    askingPrice: number | null;
    dealType: string | null;
    grossRevenue: number | null;
    tags: string[] | null;
    brokerage: string | null;
    ebitdaMargin: number | null;
    ebitda: number | null;
    revenue: number | null;
  };
  screener: {
    id: string;
    content: string;
  };
  chunks: string[];
}

export interface ProcessChunksResult {
  intermediateSummaries: string[];
  combinedSummary: string;
}

export interface FinalizeResult {
  success: boolean;
  evaluationId: string;
  alreadyExists?: boolean;
}

export interface ScreenDealFlowResult {
  success: boolean;
  evaluationId?: string;
  message?: string;
}

// ============================================================================
// Child Handlers
// ============================================================================

/**
 * Fetch Data Handler
 * Fetches deal and screener from database, splits content into chunks.
 * This is the first step in the flow.
 */
export async function fetchDataHandler(job: Job<ScreenDealFlowData>): Promise<FetchDataResult> {
  const { dealId, screenerId, jobId } = job.data;

  console.log(`[fetch-data] Starting for job ${jobId}`, { dealId, screenerId });

  const idempotencyKey = generateIdempotencyKey("screen-deal:fetch", {
    dealId,
    screenerId,
  });

  const { result, fromCache } = await withIdempotency<FetchDataResult>(
    idempotencyKey,
    async () => {
      // Fetch deal information
      const [fetchedDeal] = await db
        .select({
          id: deals.id,
          title: deals.title,
          dealCaption: deals.dealCaption,
          dealTeaser: deals.dealTeaser,
          askingPrice: deals.askingPrice,
          dealType: deals.dealType,
          grossRevenue: deals.grossRevenue,
          tags: deals.tags,
          brokerage: deals.brokerage,
          ebitdaMargin: deals.ebitdaMargin,
          ebitda: deals.ebitda,
          revenue: deals.revenue,
        })
        .from(deals)
        .where(eq(deals.id, dealId));

      if (!fetchedDeal) {
        throw new Error(`Deal not found: ${dealId}`);
      }

      // Fetch screener
      const [fetchedScreener] = await db
        .select({
          id: screeners.id,
          content: screeners.content,
        })
        .from(screeners)
        .where(eq(screeners.id, screenerId));

      if (!fetchedScreener) {
        throw new Error(`Screener not found: ${screenerId}`);
      }

      // Split content into chunks
      const chunks = await splitContentIntoChunks(fetchedScreener.content);

      return {
        deal: fetchedDeal,
        screener: fetchedScreener,
        chunks,
      };
    }
  );

  if (fromCache) {
    console.log(`[fetch-data] Returning cached result for job ${jobId}`);
  }

  console.log(`[fetch-data] Completed for job ${jobId}`, {
    chunksCount: result.chunks.length,
    fromCache,
  });

  return result;
}

/**
 * Process Chunks Handler
 * Processes content chunks in batches using AI.
 * Depends on fetch-data result via getChildrenValues().
 */
export async function processChunksHandler(job: Job<ScreenDealFlowData>): Promise<ProcessChunksResult> {
  const { dealId, screenerId, jobId } = job.data;

  console.log(`[process-chunks] Starting for job ${jobId}`);

  // Get the fetch-data result from child job
  const childrenValues = await job.getChildrenValues<FetchDataResult>();
  const fetchResult = Object.values(childrenValues)[0];

  if (!fetchResult) {
    throw new Error("No fetch-data result found");
  }

  const { deal, chunks } = fetchResult;
  const totalChunks = chunks.length;

  console.log(`[process-chunks] Processing ${totalChunks} chunks for job ${jobId}`);

  // Process chunks in batches of 5
  const BATCH_SIZE = 5;
  const intermediateSummaries: string[] = [];

  for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, totalChunks);
    const batchChunks = chunks.slice(i, batchEnd);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    // Idempotency key for this batch
    const batchIdempotencyKey = generateIdempotencyKey("screen-deal:chunk-batch", {
      dealId,
      screenerId,
      batch: batchIndex.toString(),
    });

    const { result: batchResults, fromCache } = await withIdempotency<string[]>(
      batchIdempotencyKey,
      async () => {
        const results: string[] = [];

        for (let j = 0; j < batchChunks.length; j++) {
          const chunk = batchChunks[j];
          const chunkIndex = i + j;

          console.log(`[process-chunks] Processing chunk ${chunkIndex + 1}/${totalChunks}`);

          const summary = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: `Evaluate this listing ${JSON.stringify(deal)}: ${chunk}`,
          });

          results.push(summary.text);
        }

        return results;
      }
    );

    if (fromCache) {
      console.log(`[process-chunks] Batch ${batchIndex} from cache`);
    }

    intermediateSummaries.push(...batchResults);

    // Update progress (batches represent 60% of total progress, 15%-75%)
    const batchProgress = Math.round(15 + ((batchEnd / totalChunks) * 60));
    await updateParentProgress(job, `Processing chunk ${batchEnd}/${totalChunks}`, batchProgress);
  }

  const combinedSummary = intermediateSummaries.join("\n\n=== Next Section ===\n\n");

  console.log(`[process-chunks] Completed for job ${jobId}`, {
    summariesCount: intermediateSummaries.length,
  });

  return {
    intermediateSummaries,
    combinedSummary,
  };
}

/**
 * Finalize Handler
 * Generates final summary using AI and saves to database.
 * Depends on process-chunks result via getChildrenValues().
 */
export async function finalizeHandler(job: Job<ScreenDealFlowData>): Promise<FinalizeResult> {
  const { dealId, screenerId, jobId } = job.data;

  console.log(`[finalize] Starting for job ${jobId}`);

  await updateParentProgress(job, "Generating final summary", 80);

  // Get the process-chunks result
  const childrenValues = await job.getChildrenValues<ProcessChunksResult>();
  const processResult = Object.values(childrenValues)[0];

  if (!processResult) {
    throw new Error("No process-chunks result found");
  }

  const { combinedSummary } = processResult;

  // Idempotency key for final summary generation
  const summaryIdempotencyKey = generateIdempotencyKey("screen-deal:final-summary", {
    dealId,
    screenerId,
  });

  const { result: finalSummary, fromCache: summaryFromCache } = await withIdempotency(
    summaryIdempotencyKey,
    async () => {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        prompt: `Combine the following summaries into a single summary: ${combinedSummary}`,
        schema: z.object({
          title: z.string(),
          score: z.number(),
          sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
          explanation: z.string(),
        }),
      });
      return result.object;
    }
  );

  if (summaryFromCache) {
    console.log(`[finalize] Final summary from cache for job ${jobId}`);
  }

  await updateParentProgress(job, "Saving results to database", 95);

  // Convert sentiment
  let sentiment: typeof Sentiment[keyof typeof Sentiment] = Sentiment.NEUTRAL;
  switch (finalSummary.sentiment) {
    case "POSITIVE":
      sentiment = Sentiment.POSITIVE;
      break;
    case "NEGATIVE":
      sentiment = Sentiment.NEGATIVE;
      break;
    case "NEUTRAL":
    default:
      sentiment = Sentiment.NEUTRAL;
      break;
  }

  // Idempotent database insert - check if already exists
  const existing = await db
    .select({ id: aiScreenings.id })
    .from(aiScreenings)
    .where(
      and(
        eq(aiScreenings.dealId, dealId),
        eq(aiScreenings.screenerId, screenerId)
      )
    );

  if (existing.length > 0) {
    console.log(`[finalize] Screening already exists for job ${jobId}`, {
      evaluationId: existing[0].id,
    });

    await updateParentProgress(job, "Completed", 100);

    return {
      success: true,
      evaluationId: existing[0].id,
      alreadyExists: true,
    };
  }

  // Insert new screening
  const [savedEvaluation] = await db
    .insert(aiScreenings)
    .values({
      dealId,
      title: finalSummary.title,
      explanation: finalSummary.explanation,
      score: finalSummary.score ? Math.round(finalSummary.score) : null,
      content: combinedSummary,
      sentiment,
      screenerId,
    })
    .returning({ id: aiScreenings.id });

  if (!savedEvaluation) {
    throw new Error("Failed to save evaluation to database");
  }

  await updateParentProgress(job, "Completed", 100);

  console.log(`[finalize] Completed for job ${jobId}`, {
    evaluationId: savedEvaluation.id,
  });

  return {
    success: true,
    evaluationId: savedEvaluation.id,
  };
}

/**
 * Parent Handler
 * Called after all children complete. Aggregates results.
 */
export async function screenDealParentHandler(job: Job<ScreenDealFlowData>): Promise<ScreenDealFlowResult> {
  const { jobId } = job.data;

  console.log(`[screen-deal-parent] Processing parent job ${jobId}`);

  // Get all children values
  const childrenValues = await job.getChildrenValues<FinalizeResult>();
  const finalizeResult = Object.values(childrenValues)[0];

  if (!finalizeResult) {
    console.error(`[screen-deal-parent] No finalize result found for job ${jobId}`);
    return {
      success: false,
      message: "Flow completed but no results found",
    };
  }

  console.log(`[screen-deal-parent] Flow completed for job ${jobId}`, {
    evaluationId: finalizeResult.evaluationId,
    alreadyExists: finalizeResult.alreadyExists,
  });

  return {
    success: true,
    evaluationId: finalizeResult.evaluationId,
    message: finalizeResult.alreadyExists
      ? "Evaluation already exists"
      : "Evaluation completed successfully",
  };
}

// ============================================================================
// Flow Builder
// ============================================================================

/**
 * Builds the screen-deal flow structure.
 *
 * Flow execution order (BullMQ processes children first, bottom-up):
 * 1. fetch-data (leaf child, runs first)
 * 2. process-chunks (depends on fetch-data)
 * 3. finalize (depends on process-chunks)
 * 4. screen-deal (parent, runs last)
 */
export function buildScreenDealFlow(data: ScreenDealFlowData): FlowJob {
  return {
    name: "screen-deal",
    queueName: QUEUE_NAMES.SCREEN_DEAL,
    data,
    opts: {
      ...FLOW_DEFAULT_JOB_OPTIONS,
      jobId: data.jobId,
    },
    children: [
      {
        name: "finalize",
        queueName: FLOW_QUEUE_NAMES.SCREEN_DEAL_FINALIZE,
        data,
        opts: FLOW_DEFAULT_JOB_OPTIONS,
        children: [
          {
            name: "process-chunks",
            queueName: FLOW_QUEUE_NAMES.SCREEN_DEAL_PROCESS_CHUNKS,
            data,
            opts: FLOW_DEFAULT_JOB_OPTIONS,
            children: [
              {
                name: "fetch-data",
                queueName: FLOW_QUEUE_NAMES.SCREEN_DEAL_FETCH,
                data,
                opts: FLOW_DEFAULT_JOB_OPTIONS,
              },
            ],
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Updates the parent job's progress.
 * Used by child jobs to report progress to the overall flow.
 */
async function updateParentProgress(
  job: Job,
  step: string,
  percentage: number
): Promise<void> {
  try {
    // Child jobs can't directly update parent progress, but we can
    // update our own progress which the parent can aggregate
    await job.updateProgress({ step, percentage });
  } catch (error) {
    console.error("[updateParentProgress] Error:", error);
  }
}
