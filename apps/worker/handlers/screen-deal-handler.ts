import { Job } from "bullmq";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import db, {
  Sentiment,
  deals,
  dealOpportunities,
  dealFinancialSnapshots,
  companies,
  screeners,
  aiScreenings,
  eq,
  and,
  desc,
} from "@repo/db";
import { openai } from "../lib/ai/available-models";
import { splitContentIntoChunks } from "../lib/utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Steps for the screen deal job.
 * Using string enum for better debugging and logging.
 */
export enum ScreenDealStep {
  FetchData = "fetch_data",
  ProcessChunks = "process_chunks",
  GenerateSummary = "generate_summary",
  SaveToDatabase = "save_to_database",
  Done = "done",
}

/**
 * Job data for screen deal - includes step state for resumability
 */
export interface ScreenDealJobData {
  jobId: string;
  dealId: string;
  screenerId: string;
  userId: string;
  dealOpportunityIdForSave?: string;
  // Step state - persisted via job.updateData() for resume on retry
  step?: ScreenDealStep;
  // Intermediate results cached for resume
  fetchResult?: {
    deal: DealInfo;
    screenerContent: string;
    chunks: string[];
  };
  chunkResults?: {
    processedChunks: number;
    intermediateSummaries: string[];
  };
  summaryResult?: {
    title: string;
    score: number;
    sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
    explanation: string;
    combinedSummary: string;
  };
}

interface DealInfo {
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
}

export interface ScreenDealResult {
  success: boolean;
  evaluationId?: string;
  message?: string;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Screen Deal Handler using the "Process Step Jobs" pattern.
 *
 * Each step saves its progress via job.updateData(), so if the job fails
 * and retries, it resumes from the last completed step instead of starting over.
 *
 * This is idempotent: running the job multiple times produces the same result.
 */
export async function screenDealHandler(
  job: Job<ScreenDealJobData>,
): Promise<ScreenDealResult> {
  const { dealId, screenerId, jobId } = job.data;
  let step = job.data.step ?? ScreenDealStep.FetchData;

  console.log(`[screen-deal] Starting job ${jobId} at step: ${step}`);

  while (step !== ScreenDealStep.Done) {
    switch (step) {
      // ========================================
      // Step 1: Fetch deal and screener data
      // ========================================
      case ScreenDealStep.FetchData: {
        await job.updateProgress({
          step: "Fetching deal information",
          percentage: 5,
        });
        console.log(`[screen-deal] ${jobId}: Fetching data`);

        // Resolve dealId to DealOpportunity + Company (or fallback to legacy Deal)
        const [opp] = await db
          .select()
          .from(dealOpportunities)
          .where(eq(dealOpportunities.legacyDealId, dealId));

        let fetchedDeal: DealInfo;
        let dealOpportunityIdForSave: string;

        if (opp) {
          const [company, latestSnapshot] = await Promise.all([
            db
              .select()
              .from(companies)
              .where(eq(companies.id, opp.companyId))
              .then((rows) => rows[0]),
            db
              .select()
              .from(dealFinancialSnapshots)
              .where(eq(dealFinancialSnapshots.dealOpportunityId, opp.id))
              .orderBy(
                desc(dealFinancialSnapshots.createdAt),
                desc(dealFinancialSnapshots.id),
              )
              .limit(1)
              .then((rows) => rows[0]),
          ]);

          fetchedDeal = {
            id: opp.id,
            title: null,
            dealCaption: company?.name ?? opp.dealTeaser ?? "",
            dealTeaser: opp.dealTeaser,
            askingPrice: latestSnapshot?.askingPrice ?? opp.askingPrice,
            dealType: opp.dealType,
            grossRevenue: company?.revenueEstimate ?? null,
            tags: opp.tags,
            brokerage: opp.brokerage,
            ebitdaMargin:
              latestSnapshot?.ebitdaMargin ??
              opp.ebitdaMargin ??
              company?.ebitdaMarginEstimate ??
              null,
            ebitda:
              latestSnapshot?.ebitda ??
              opp.ebitda ??
              company?.ebitdaEstimate ??
              null,
            revenue:
              latestSnapshot?.revenue ??
              opp.revenue ??
              company?.revenueEstimate ??
              null,
          };
          dealOpportunityIdForSave = opp.id;
        } else {
          throw new Error(
            `Deal ${dealId} not migrated. Run db:migrate-deals first.`,
          );
        }

        await job.updateData({
          ...job.data,
          dealOpportunityIdForSave,
        });

        // Fetch screener
        await job.updateProgress({ step: "Fetching screener", percentage: 10 });
        const [screener] = await db
          .select({
            id: screeners.id,
            name: screeners.name,
            description: screeners.description,
          })
          .from(screeners)
          .where(eq(screeners.id, screenerId));

        if (!screener) {
          throw new Error(`Screener not found: ${screenerId}`);
        }

        // Split content into chunks
        await job.updateProgress({
          step: "Splitting content into chunks",
          percentage: 15,
        });
        const screenerContent = [screener.name, screener.description]
          .filter(Boolean)
          .join("\n\n");
        const chunks = await splitContentIntoChunks(screenerContent);

        console.log(
          `[screen-deal] ${jobId}: Fetched data, ${chunks.length} chunks`,
        );

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: ScreenDealStep.ProcessChunks,
          fetchResult: {
            deal: fetchedDeal,
            screenerContent,
            chunks,
          },
        });
        step = ScreenDealStep.ProcessChunks;
        break;
      }

      // ========================================
      // Step 2: Process chunks with AI
      // ========================================
      case ScreenDealStep.ProcessChunks: {
        const fetchResult = job.data.fetchResult;
        if (!fetchResult) {
          throw new Error("Missing fetchResult - job state corrupted");
        }

        const { deal, chunks } = fetchResult;
        const totalChunks = chunks.length;

        // Resume from where we left off if retrying
        const existingResults = job.data.chunkResults ?? {
          processedChunks: 0,
          intermediateSummaries: [],
        };
        const startIndex = existingResults.processedChunks;
        const intermediateSummaries = [
          ...existingResults.intermediateSummaries,
        ];

        console.log(
          `[screen-deal] ${jobId}: Processing chunks ${startIndex + 1}-${totalChunks}`,
        );

        // Process remaining chunks
        for (let i = startIndex; i < totalChunks; i++) {
          const chunk = chunks[i];
          const chunkPercentage = 15 + Math.round(((i + 1) / totalChunks) * 60);
          await job.updateProgress({
            step: `Processing chunk ${i + 1}/${totalChunks}`,
            percentage: chunkPercentage,
          });

          const summary = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: `Evaluate this listing ${JSON.stringify(deal)}: ${chunk}`,
          });

          intermediateSummaries.push(summary.text);

          // Save progress after each chunk (in case of failure)
          // Only save every 3 chunks to reduce Redis writes, or on the last chunk
          if ((i + 1) % 3 === 0 || i === totalChunks - 1) {
            await job.updateData({
              ...job.data,
              chunkResults: {
                processedChunks: i + 1,
                intermediateSummaries,
              },
            });
          }
        }

        console.log(`[screen-deal] ${jobId}: All chunks processed`);

        // Move to next step
        await job.updateData({
          ...job.data,
          step: ScreenDealStep.GenerateSummary,
          chunkResults: {
            processedChunks: totalChunks,
            intermediateSummaries,
          },
        });
        step = ScreenDealStep.GenerateSummary;
        break;
      }

      // ========================================
      // Step 3: Generate final summary
      // ========================================
      case ScreenDealStep.GenerateSummary: {
        await job.updateProgress({
          step: "Generating final summary",
          percentage: 80,
        });

        const chunkResults = job.data.chunkResults;
        if (!chunkResults) {
          throw new Error("Missing chunkResults - job state corrupted");
        }

        const combinedSummary = chunkResults.intermediateSummaries.join(
          "\n\n=== Next Section ===\n\n",
        );

        console.log(`[screen-deal] ${jobId}: Generating final summary`);

        const finalSummary = await generateObject({
          model: openai("gpt-4o-mini"),
          prompt: `Combine the following summaries into a single summary: ${combinedSummary}`,
          schema: z.object({
            title: z.string(),
            score: z.number(),
            sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
            explanation: z.string(),
          }),
        });

        console.log(`[screen-deal] ${jobId}: Summary generated`);

        // Save progress and move to next step
        await job.updateData({
          ...job.data,
          step: ScreenDealStep.SaveToDatabase,
          summaryResult: {
            ...finalSummary.object,
            combinedSummary,
          },
        });
        step = ScreenDealStep.SaveToDatabase;
        break;
      }

      // ========================================
      // Step 4: Save to database
      // ========================================
      case ScreenDealStep.SaveToDatabase: {
        await job.updateProgress({
          step: "Saving results to database",
          percentage: 95,
        });

        const summaryResult = job.data.summaryResult;
        if (!summaryResult) {
          throw new Error("Missing summaryResult - job state corrupted");
        }

        const dealOpportunityId =
          job.data.dealOpportunityIdForSave ??
          (await db
            .select({ id: dealOpportunities.id })
            .from(dealOpportunities)
            .where(eq(dealOpportunities.legacyDealId, dealId))
            .then((r) => r[0]?.id));
        if (!dealOpportunityId)
          throw new Error(`DealOpportunity not found for deal ${dealId}`);

        // Check if already saved (idempotency)
        const existing = await db
          .select({ id: aiScreenings.id })
          .from(aiScreenings)
          .where(
            and(
              eq(aiScreenings.dealOpportunityId, dealOpportunityId),
              eq(aiScreenings.screenerId, screenerId),
            ),
          );

        if (existing.length > 0) {
          console.log(
            `[screen-deal] ${jobId}: Screening already exists, skipping insert`,
          );
          await job.updateData({ ...job.data, step: ScreenDealStep.Done });
          await job.updateProgress({ step: "Completed", percentage: 100 });
          return {
            success: true,
            evaluationId: existing[0]?.id,
            message: "Evaluation already exists",
          };
        }

        // Convert sentiment
        let sentiment: (typeof Sentiment)[keyof typeof Sentiment] =
          Sentiment.NEUTRAL;
        switch (summaryResult.sentiment) {
          case "POSITIVE":
            sentiment = Sentiment.POSITIVE;
            break;
          case "NEGATIVE":
            sentiment = Sentiment.NEGATIVE;
            break;
        }

        // Insert new screening
        const [savedEvaluation] = await db
          .insert(aiScreenings)
          .values({
            dealOpportunityId,
            title: summaryResult.title,
            explanation: summaryResult.explanation,
            score: summaryResult.score ? Math.round(summaryResult.score) : null,
            content: summaryResult.combinedSummary,
            sentiment,
            screenerId,
          })
          .returning({ id: aiScreenings.id });

        if (!savedEvaluation) {
          throw new Error("Failed to save evaluation to database");
        }

        console.log(`[screen-deal] ${jobId}: Saved to database`);

        // Mark as done
        await job.updateData({ ...job.data, step: ScreenDealStep.Done });
        await job.updateProgress({ step: "Completed", percentage: 100 });

        return {
          success: true,
          evaluationId: savedEvaluation.id,
          message: "Evaluation completed successfully",
        };
      }

      default:
        throw new Error(`Invalid step: ${step}`);
    }
  }

  // If we reach here, job was already completed
  return {
    success: true,
    message: "Job already completed",
  };
}
