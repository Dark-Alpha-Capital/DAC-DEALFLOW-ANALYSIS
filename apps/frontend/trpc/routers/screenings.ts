import crypto from "crypto";
import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { aiScreenings, eq, DealType, Sentiment } from "@repo/db";
import { DeleteReasoningById, UpsertScreenerResponse } from "@repo/db/mutations";
import { GetDealOpportunityById, GetDealOpportunityByLegacyDealId } from "@repo/db/queries";
import { screenDealQueue, type ScreenDealJobData } from "@repo/redis-queue";

const saveScreeningSchema = z.object({
  dealId: z.string(),
  dealType: z.nativeEnum(DealType),
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
});

const saveRawScreeningSchema = z.object({
  result: z.string(),
  dealId: z.string(),
});

const updateScreeningSchema = z.object({
  screeningId: z.string(),
  dealId: z.string(),
  dealType: z.nativeEnum(DealType),
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
});

const saveEvaluationSchema = z.object({
  dealId: z.string(),
  dealOpportunityId: z.string().optional(),
  screenerId: z.string(),
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
  score: z.number().optional(),
  responses: z
    .array(
      z.object({
        questionId: z.string(),
        score: z.number().int().min(0).max(10),
        notes: z.string().optional(),
      }),
    )
    .default([]),
});

const bulkScreenSchema = z.object({
  dealIds: z.array(z.string()).optional(),
  dealOpportunityIds: z.array(z.string()).optional(),
  screenerId: z.string(),
}).refine(
  (data) =>
    (data.dealIds?.length ?? 0) > 0 || (data.dealOpportunityIds?.length ?? 0) > 0,
  { message: "At least one deal ID or deal opportunity ID is required" },
);

const bulkManualScreenSchema = z.object({
  dealOpportunityIds: z.array(z.string()).min(1, "At least one deal opportunity ID is required"),
});

async function resolveDealOpportunityId({
  dealId,
  dealOpportunityId,
}: {
  dealId?: string;
  dealOpportunityId?: string;
}) {
  if (dealOpportunityId) {
    const byId = await GetDealOpportunityById(dealOpportunityId);
    if (byId) return byId.id;
  }

  if (!dealId) return null;

  const byId = await GetDealOpportunityById(dealId);
  if (byId) return byId.id;

  const byLegacyDealId = await GetDealOpportunityByLegacyDealId(dealId);
  return byLegacyDealId?.id ?? null;
}

function toSentiment(
  sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE",
): (typeof Sentiment)[keyof typeof Sentiment] {
  switch (sentiment) {
    case "POSITIVE":
      return Sentiment.POSITIVE;
    case "NEGATIVE":
      return Sentiment.NEGATIVE;
    case "NEUTRAL":
    default:
      return Sentiment.NEUTRAL;
  }
}

export const screeningsRouter = createTRPCRouter({
  save: protectedProcedure
    .input(saveScreeningSchema)
    .mutation(async ({ input }) => {
      const dealOpportunityId = await resolveDealOpportunityId({
        dealId: input.dealId,
      });

      if (!dealOpportunityId) {
        throw new Error("Deal opportunity not found");
      }

      const [addedScreenResult] = await db
        .insert(aiScreenings)
        .values({
          dealOpportunityId,
          title: input.title,
          explanation: input.explanation,
          sentiment: toSentiment(input.sentiment),
        })
        .returning();

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}`);
      });
      return { screeningId: addedScreenResult?.id };
    }),

  saveRaw: protectedProcedure
    .input(saveRawScreeningSchema)
    .mutation(async ({ input }) => {
      const dealOpportunityId = await resolveDealOpportunityId({
        dealId: input.dealId,
      });

      if (!dealOpportunityId) {
        throw new Error("Deal opportunity not found");
      }

      const [addedScreenResult] = await db
        .insert(aiScreenings)
        .values({
          dealOpportunityId,
          title: "AI Screening Result",
          explanation: input.result,
          sentiment: Sentiment.NEUTRAL,
        })
        .returning();

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}`);
      });
      return { screeningId: addedScreenResult?.id };
    }),

  update: protectedProcedure
    .input(updateScreeningSchema)
    .mutation(async ({ input }) => {
      await db
        .update(aiScreenings)
        .set({
          title: input.title,
          explanation: input.explanation,
          sentiment: toSentiment(input.sentiment),
        })
        .where(eq(aiScreenings.id, input.screeningId));

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}`);
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ screeningId: z.string(), dealId: z.string() }))
    .mutation(async ({ input }) => {
      await DeleteReasoningById(input.screeningId);
      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}`);
      });
      return { success: true };
    }),

  saveEvaluation: protectedProcedure
    .input(saveEvaluationSchema)
    .mutation(async ({ input }) => {
      const dealOpportunityId = await resolveDealOpportunityId({
        dealId: input.dealId,
        dealOpportunityId: input.dealOpportunityId,
      });

      if (!dealOpportunityId) {
        throw new Error("Deal opportunity not found");
      }

      const [savedEvaluation] = await db
        .insert(aiScreenings)
        .values({
          dealOpportunityId,
          title: input.title,
          explanation: input.explanation,
          score: input.score != null ? Math.round(input.score) : null,
          content:
            input.responses.length > 0
              ? JSON.stringify(input.responses)
              : null,
          sentiment: toSentiment(input.sentiment),
          screenerId: input.screenerId,
        })
        .returning();

      await Promise.all(
        input.responses.map((response) =>
          UpsertScreenerResponse({
            dealOpportunityId,
            questionId: response.questionId,
            score: response.score,
            source: "AI",
            notes: response.notes || null,
          }),
        ),
      );

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealId}`);
        revalidatePath(`/raw-deals/${dealOpportunityId}/screen`);
      });
      return { evaluationId: savedEvaluation?.id, data: savedEvaluation };
    }),

  bulkScreen: protectedProcedure
    .input(bulkScreenSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id as string;
      const ids = input.dealOpportunityIds ?? input.dealIds ?? [];
      const isDealOpportunityIds = !!input.dealOpportunityIds?.length;

      const results = await Promise.all(
        ids.map(async (id: string) => {
          const jobId = crypto.randomUUID();
          const jobData: ScreenDealJobData = {
            jobId,
            userId,
            dealId: id,
            screenerId: input.screenerId,
            ...(isDealOpportunityIds && { dealOpportunityId: id }),
          };

          const job = await screenDealQueue.add("screen", jobData, {
            jobId,
          });

          return { jobId, dealId: id, bullmqJobId: job.id };
        }),
      );

      return {
        ok: true,
        jobs: results.map((result) => ({
          jobId: result.jobId,
          dealId: result.dealId,
        })),
      };
    }),

  bulkManualScreen: protectedProcedure
    .input(bulkManualScreenSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id as string;

      const results = await Promise.all(
        input.dealOpportunityIds.map(async (dealOpportunityId: string) => {
          const jobId = crypto.randomUUID();
          const jobData = {
            jobId,
            userId,
            dealId: dealOpportunityId,
            dealOpportunityId,
          };

          const job = await screenDealQueue.add("manual-screen", jobData, {
            jobId,
          });

          return { jobId, dealOpportunityId, bullmqJobId: job.id };
        }),
      );

      return {
        ok: true,
        jobs: results.map((r) => ({
          jobId: r.jobId,
          dealOpportunityId: r.dealOpportunityId,
        })),
      };
    }),
});
