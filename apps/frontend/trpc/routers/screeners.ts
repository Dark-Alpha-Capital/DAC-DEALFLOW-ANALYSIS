import { z } from "zod";
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, {
  screeners,
  screenerQuestions,
  ScreenerResponseSource,
  ScreenerResponseType,
  eq,
  and,
  asc,
} from "@repo/db";
import {
  getAllScreeners,
  getScreenerById,
  getScreenerQuestions,
  getScreenerResponsesByDealOpportunityId,
  getScreenerWithQuestions,
} from "@repo/db/queries";
import {
  DeleteScreenerById,
  DeleteScreenerQuestionById,
  UpsertScreenerResponse,
} from "@repo/db/mutations";

const screenerTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

const screenerQuestionSchema = z.object({
  screenerId: z.string().min(1, "Screener ID is required"),
  question: z.string().min(1, "Question is required"),
  weight: z.coerce.number().int().min(0).max(100),
  responseType: z.literal(ScreenerResponseType.SCORE).default(
    ScreenerResponseType.SCORE,
  ),
});

const screenerQuestionUpdateSchema = screenerQuestionSchema.extend({
  id: z.string().min(1, "Question ID is required"),
});

const screenerResponseInputSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  score: z.coerce.number().int().min(0).max(10),
  notes: z.string().optional(),
});

function scheduleRevalidateScreenerPaths(screenerId?: string) {
  after(async () => {
    revalidatePath("/screeners");
    revalidateTag("screeners", "max");
    if (screenerId) {
      revalidatePath(`/screeners/${screenerId}`);
      revalidateTag(`screener-${screenerId}`, "max");
    }
  });
}

export const screenersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    const result = await getAllScreeners();
    return result || [];
  }),

  getById: protectedProcedure
    .input(z.object({ screenerId: z.string().min(1) }))
    .query(async ({ input }) => {
      return await getScreenerWithQuestions(input.screenerId);
    }),

  createTemplate: protectedProcedure
    .input(screenerTemplateSchema)
    .mutation(async ({ input }) => {
      const [created] = await db
        .insert(screeners)
        .values({
          name: input.name,
          category: input.category,
          description: input.description || null,
        })
        .returning();

      scheduleRevalidateScreenerPaths(created?.id);
      return { screenerId: created?.id };
    }),

  updateTemplate: protectedProcedure
    .input(
      screenerTemplateSchema.extend({
        screenerId: z.string().min(1, "Screener ID is required"),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(screeners)
        .set({
          name: input.name,
          category: input.category,
          description: input.description || null,
          updatedAt: new Date(),
        })
        .where(eq(screeners.id, input.screenerId));

      scheduleRevalidateScreenerPaths(input.screenerId);
      return { screenerId: input.screenerId };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ screenerId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await DeleteScreenerById(input.screenerId);
      scheduleRevalidateScreenerPaths(input.screenerId);
      return { success: true };
    }),

  createQuestion: protectedProcedure
    .input(screenerQuestionSchema)
    .mutation(async ({ input }) => {
      const existingQuestions = await getScreenerQuestions(input.screenerId);
      const nextPosition =
        existingQuestions.length > 0
          ? Math.max(...existingQuestions.map((question) => question.position)) +
            1
          : 0;

      const [created] = await db
        .insert(screenerQuestions)
        .values({
          screenerId: input.screenerId,
          question: input.question,
          weight: input.weight,
          responseType: input.responseType,
          position: nextPosition,
        })
        .returning();

      scheduleRevalidateScreenerPaths(input.screenerId);
      return { questionId: created?.id };
    }),

  updateQuestion: protectedProcedure
    .input(screenerQuestionUpdateSchema)
    .mutation(async ({ input }) => {
      await db
        .update(screenerQuestions)
        .set({
          question: input.question,
          weight: input.weight,
          responseType: input.responseType,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(screenerQuestions.id, input.id),
            eq(screenerQuestions.screenerId, input.screenerId),
          ),
        );

      scheduleRevalidateScreenerPaths(input.screenerId);
      return { questionId: input.id };
    }),

  deleteQuestion: protectedProcedure
    .input(
      z.object({
        screenerId: z.string().min(1),
        questionId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await DeleteScreenerQuestionById(input.screenerId, input.questionId);

      const remaining = await db
        .select({ id: screenerQuestions.id })
        .from(screenerQuestions)
        .where(eq(screenerQuestions.screenerId, input.screenerId))
        .orderBy(asc(screenerQuestions.position), asc(screenerQuestions.createdAt));

      if (remaining.length > 0) {
        const OFFSET = 100000;
        const now = new Date();

        await db.transaction(async (tx) => {
          await Promise.all(
            remaining.map((question, index) =>
              tx
                .update(screenerQuestions)
                .set({ position: OFFSET + index, updatedAt: now })
                .where(eq(screenerQuestions.id, question.id)),
            ),
          );
          await Promise.all(
            remaining.map((question, index) =>
              tx
                .update(screenerQuestions)
                .set({ position: index, updatedAt: now })
                .where(eq(screenerQuestions.id, question.id)),
            ),
          );
        });
      }

      scheduleRevalidateScreenerPaths(input.screenerId);
      return { success: true };
    }),

  reorderQuestions: protectedProcedure
    .input(
      z.object({
        screenerId: z.string().min(1),
        questionIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const questions = await getScreenerQuestions(input.screenerId);
      const availableIds = new Set(questions.map((question) => question.id));

      if (
        input.questionIds.length !== questions.length ||
        input.questionIds.some((id) => !availableIds.has(id))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Question order is invalid for this screener",
        });
      }

      const OFFSET = 100000;
      const now = new Date();

      await db.transaction(async (tx) => {
        await Promise.all(
          input.questionIds.map((questionId, index) =>
            tx
              .update(screenerQuestions)
              .set({ position: OFFSET + index, updatedAt: now })
              .where(
                and(
                  eq(screenerQuestions.id, questionId),
                  eq(screenerQuestions.screenerId, input.screenerId),
                ),
              ),
          ),
        );
        await Promise.all(
          input.questionIds.map((questionId, index) =>
            tx
              .update(screenerQuestions)
              .set({ position: index, updatedAt: now })
              .where(
                and(
                  eq(screenerQuestions.id, questionId),
                  eq(screenerQuestions.screenerId, input.screenerId),
                ),
              ),
          ),
        );
      });

      scheduleRevalidateScreenerPaths(input.screenerId);
      return { success: true };
    }),

  getResponses: protectedProcedure
    .input(
      z.object({
        dealOpportunityId: z.string().min(1),
        screenerId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      return await getScreenerResponsesByDealOpportunityId(
        input.dealOpportunityId,
        input.screenerId,
      );
    }),

  upsertResponses: protectedProcedure
    .input(
      z.object({
        dealOpportunityId: z.string().min(1),
        screenerId: z.string().min(1),
        source: z.nativeEnum(ScreenerResponseSource),
        responses: z.array(screenerResponseInputSchema).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const screener = await getScreenerById(input.screenerId);
      if (!screener) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Screener not found",
        });
      }

      const questions = await getScreenerQuestions(input.screenerId);
      const questionIds = new Set(questions.map((question) => question.id));

      if (input.responses.some((response) => !questionIds.has(response.questionId))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more responses do not belong to this screener",
        });
      }

      const saved = await Promise.all(
        input.responses.map((response) =>
          UpsertScreenerResponse({
            dealOpportunityId: input.dealOpportunityId,
            questionId: response.questionId,
            score: response.score,
            source: input.source,
            notes: response.notes || null,
          }),
        ),
      );

      after(async () => {
        revalidatePath(`/raw-deals/${input.dealOpportunityId}/screen`);
        revalidateTag(`deal-screening-${input.dealOpportunityId}`, "max");
      });
      return {
        success: true,
        savedCount: saved.filter(Boolean).length,
      };
    }),
});
