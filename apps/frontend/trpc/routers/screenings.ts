import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { aiScreenings, eq, DealType, Sentiment } from "db";
import { DeleteReasoningById } from "db/mutations";
import { revalidatePath } from "next/cache";
import { screenDealQueue, type ScreenDealJobData } from "@/lib/queue-client";
import { redisClient } from "@/lib/redis";
import crypto from "crypto";

const screenDealSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
});

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
  screenerId: z.string(),
  title: z.string(),
  explanation: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
  score: z.number().optional(),
  content: z.string().optional(),
});

const bulkScreenSchema = z.object({
  dealIds: z.array(z.string()).min(1, "At least one deal ID is required"),
  screenerId: z.string(),
});

export const screeningsRouter = createTRPCRouter({
  save: protectedProcedure
    .input(saveScreeningSchema)
    .mutation(async ({ input }) => {
      const [addedScreenResult] = await db
        .insert(aiScreenings)
        .values({
          dealId: input.dealId,
          title: input.title,
          explanation: input.explanation,
          sentiment: input.sentiment,
        })
        .returning();

      revalidatePath(`/raw-deals/${input.dealId}`);

      return { screeningId: addedScreenResult?.id };
    }),

  saveRaw: protectedProcedure
    .input(saveRawScreeningSchema)
    .mutation(async ({ input }) => {
      const [addedScreenResult] = await db
        .insert(aiScreenings)
        .values({
          dealId: input.dealId,
          title: "AI Screening Result",
          explanation: input.result,
          sentiment: Sentiment.NEUTRAL,
        })
        .returning();

      revalidatePath(`/raw-deals/${input.dealId}`);

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
          sentiment: input.sentiment,
        })
        .where(eq(aiScreenings.id, input.screeningId));

      revalidatePath(`/raw-deals/${input.dealId}`);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ screeningId: z.string(), dealId: z.string() }))
    .mutation(async ({ input }) => {
      await DeleteReasoningById(input.screeningId);

      revalidatePath(`/raw-deals/${input.dealId}`);

      return { success: true };
    }),

  saveEvaluation: protectedProcedure
    .input(saveEvaluationSchema)
    .mutation(async ({ input }) => {
      let sentiment: (typeof Sentiment)[keyof typeof Sentiment] =
        Sentiment.NEUTRAL;
      if (input.sentiment) {
        switch (input.sentiment) {
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
      }

      const [savedEvaluation] = await db
        .insert(aiScreenings)
        .values({
          dealId: input.dealId,
          title: input.title,
          explanation: input.explanation,
          score: input.score ? Math.round(input.score) : null,
          content: input.content || null,
          sentiment,
          screenerId: input.screenerId,
        })
        .returning();

      revalidatePath(`/raw-deals/${input.dealId}`);
      revalidatePath(`/manual-deals/${input.dealId}`);
      revalidatePath(`/inferred-deals/${input.dealId}`);

      return { evaluationId: savedEvaluation?.id, data: savedEvaluation };
    }),

  bulkScreen: protectedProcedure
    .input(bulkScreenSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id as string;

      // Create individual jobs for each deal ID
      const jobPromises = input.dealIds.map(async (dealId: string) => {
        const jobId = crypto.randomUUID();

        // Add job to BullMQ queue
        const jobData: ScreenDealJobData = {
          jobId,
          userId: userId,
          dealId,
          screenerId: input.screenerId,
        };

        const job = await screenDealQueue.add("screen", jobData, {
          jobId, // Use our own jobId for easier tracking
        });

        console.log(`Added job ${job.id} for deal ${dealId}`);
        return { jobId, dealId, bullmqJobId: job.id };
      });

      // Wait for all jobs to be added
      const results = await Promise.all(jobPromises);
      console.log(`Successfully added ${results.length} jobs to BullMQ queue`);

      return {
        ok: true,
        jobs: results.map((r) => ({ jobId: r.jobId, dealId: r.dealId })),
      };
    }),
});
