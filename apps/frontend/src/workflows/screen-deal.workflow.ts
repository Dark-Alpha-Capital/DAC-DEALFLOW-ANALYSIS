import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import db, {
  runDbWithWorkerNeonPool,
  Sentiment,
  dealOpportunities,
  dealFinancialSnapshots,
  companies,
  screeners,
  aiScreenings,
  eq,
  and,
  desc,
} from "@repo/db";
import { upsertDealOpportunityScreening } from "@repo/deal-screening";
import {
  buildScreenDealChunkPrompt,
  buildScreenDealSummaryPrompt,
} from "@repo/ai-core";
import { getOpenAIProvider } from "@repo/ai-core";
import { splitContentIntoChunks } from "@repo/rag-engine";
import { updateWorkflowJobProgress } from "@repo/db/workflow-jobs";
import {
  markWorkflowCompleted,
  markWorkflowFailed,
  markWorkflowRunning,
} from "./progress";
import type { ScreenDealParams, WorkflowWorkerEnv } from "./workflow-env";

const openai = getOpenAIProvider();

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

export class ScreenDealWorkflow extends WorkflowEntrypoint<
  WorkflowWorkerEnv,
  ScreenDealParams
> {
  async run(
    event: WorkflowEvent<ScreenDealParams>,
    step: WorkflowStep,
  ): Promise<{
    success: boolean;
    evaluationId?: string;
    message?: string;
  }> {
    return runDbWithWorkerNeonPool(async () => {
      const instanceId = event.instanceId;
      const payload = event.payload;

      console.log("inside screen-deal.workflow.ts")

      try {
        await markWorkflowRunning(instanceId);

        if (payload.mode === "manual") {
          await step.do("manual-screen", async () => {
            await updateWorkflowJobProgress(instanceId, {
              step: "Manual screening",
              percentage: 50,
            });
            const dealOpportunityId =
              payload.dealOpportunityId ?? payload.dealId;
            await upsertDealOpportunityScreening(dealOpportunityId);
            await updateWorkflowJobProgress(instanceId, {
              step: "Completed",
              percentage: 100,
            });
            return { success: true as const, message: "Manual screening completed" };
          });
          const out = {
            success: true,
            message: "Manual screening completed",
          };
          await markWorkflowCompleted(instanceId, out);
          return out;
        }

        const { jobId, dealId, screenerId } = payload;
        const dealOpportunityIdFromJob = payload.dealOpportunityId;

        const fetchPack = await step.do("fetch-data", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Fetching deal information",
            percentage: 5,
          });

          let opp: typeof dealOpportunities.$inferSelect | undefined;
          if (dealOpportunityIdFromJob) {
            const [row] = await db
              .select()
              .from(dealOpportunities)
              .where(eq(dealOpportunities.id, dealOpportunityIdFromJob));
            opp = row;
          } else {
            const [row] = await db
              .select()
              .from(dealOpportunities)
              .where(eq(dealOpportunities.legacyDealId, dealId));
            opp = row;
          }

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

          await updateWorkflowJobProgress(instanceId, {
            step: "Fetching screener",
            percentage: 10,
          });
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

          await updateWorkflowJobProgress(instanceId, {
            step: "Splitting content into chunks",
            percentage: 15,
          });
          const screenerContent = [screener.name, screener.description]
            .filter(Boolean)
            .join("\n\n");
          const chunks = await splitContentIntoChunks(screenerContent);

          return {
            fetchedDeal,
            dealOpportunityIdForSave,
            screenerContent,
            chunks,
          };
        });

        const chunkPack = await step.do(
          "process-chunks",
          { timeout: "30 minutes" },
          async () => {
            const { deal, chunks } = {
              deal: fetchPack.fetchedDeal,
              chunks: fetchPack.chunks,
            };
            const totalChunks = chunks.length;

            const intermediateSummaries: string[] = [];

            for (let i = 0; i < totalChunks; i++) {
              const chunk = chunks[i] ?? "";
              const chunkPercentage = 15 + Math.round(((i + 1) / totalChunks) * 60);
              await updateWorkflowJobProgress(instanceId, {
                step: `Processing chunk ${i + 1}/${totalChunks}`,
                percentage: chunkPercentage,
              });

              const summary = await generateText({
                model: openai("gpt-4o-mini"),
                prompt: buildScreenDealChunkPrompt(deal, chunk),
              });

              intermediateSummaries.push(summary.text);
            }

            return { intermediateSummaries };
          },
        );

        const summaryPack = await step.do("generate-summary", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Generating final summary",
            percentage: 80,
          });

          const combinedSummary = chunkPack.intermediateSummaries.join(
            "\n\n=== Next Section ===\n\n",
          );

          const finalSummary = await generateObject({
            model: openai("gpt-4o-mini"),
            prompt: buildScreenDealSummaryPrompt(combinedSummary),
            schema: z.object({
              title: z.string(),
              score: z.number(),
              sentiment: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
              explanation: z.string(),
            }),
          });

          return {
            ...finalSummary.object,
            combinedSummary,
          };
        });

        const saveOut = await step.do("save-to-database", async () => {
          await updateWorkflowJobProgress(instanceId, {
            step: "Saving results to database",
            percentage: 95,
          });

          const dealOpportunityId =
            fetchPack.dealOpportunityIdForSave ??
            (await db
              .select({ id: dealOpportunities.id })
              .from(dealOpportunities)
              .where(eq(dealOpportunities.legacyDealId, dealId))
              .then((r) => r[0]?.id));
          if (!dealOpportunityId) {
            throw new Error(`DealOpportunity not found for deal ${dealId}`);
          }

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
            await updateWorkflowJobProgress(instanceId, {
              step: "Completed",
              percentage: 100,
            });
            return {
              evaluationId: existing[0]?.id,
              message: "Evaluation already exists",
              already: true as const,
            };
          }

          let sentiment: (typeof Sentiment)[keyof typeof Sentiment] =
            Sentiment.NEUTRAL;
          switch (summaryPack.sentiment) {
            case "POSITIVE":
              sentiment = Sentiment.POSITIVE;
              break;
            case "NEGATIVE":
              sentiment = Sentiment.NEGATIVE;
              break;
          }

          const [savedEvaluation] = await db
            .insert(aiScreenings)
            .values({
              dealOpportunityId,
              title: summaryPack.title,
              explanation: summaryPack.explanation,
              score: summaryPack.score ? Math.round(summaryPack.score) : null,
              content: summaryPack.combinedSummary,
              sentiment,
              screenerId,
            })
            .returning({ id: aiScreenings.id });

          if (!savedEvaluation) {
            throw new Error("Failed to save evaluation to database");
          }

          await updateWorkflowJobProgress(instanceId, {
            step: "Completed",
            percentage: 100,
          });

          return {
            evaluationId: savedEvaluation.id,
            message: "Evaluation completed successfully",
            already: false as const,
          };
        });

        const out = {
          success: true,
          evaluationId: saveOut.evaluationId,
          message: saveOut.message,
        };
        await markWorkflowCompleted(instanceId, out);
        return out;
      } catch (err) {
        await markWorkflowFailed(instanceId, err);
        throw err;
      }
    });
  }
}
