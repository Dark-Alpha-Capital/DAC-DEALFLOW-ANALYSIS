import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  screenerQuestionFieldsSchema,
  screenerTemplateSchema,
} from "@repo/schemas";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  ScreenerResponseSource,
  ScreenerResponseType,
} from "@repo/db";
import {
  getAllScreeners,
  getAllScreenersForOrganization,
  getScreenerByIdForOrganization,
  getScreenerQuestions,
  getScreenerResponsesByDealOpportunityId,
  getScreenerWithQuestionsForOrganization,
} from "@repo/db/queries";
import {
  DeleteScreenerById,
  DeleteScreenerQuestionById,
  UpsertScreenerResponse,
  insertScreenerTemplate,
  updateScreenerTemplateById,
  insertScreenerQuestion,
  updateScreenerQuestionById,
  listScreenerQuestionIdsOrdered,
  resequenceScreenerQuestionPositionsTx,
  reorderScreenerQuestionsTx,
} from "@repo/db/mutations";

const screenerQuestionSchema = screenerQuestionFieldsSchema.extend({
  screenerId: z.string().min(1, "Screener ID is required"),
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

export const screenersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = (ctx.user as { activeOrganizationId?: string | null })
      .activeOrganizationId;
    const result = organizationId
      ? await getAllScreenersForOrganization(organizationId)
      : await getAllScreeners();
    return result || [];
  }),

  getById: protectedProcedure
    .input(z.object({ screenerId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const organizationId = (ctx.user as { activeOrganizationId?: string | null })
        .activeOrganizationId;
      return await getScreenerWithQuestionsForOrganization(
        input.screenerId,
        organizationId ?? null,
      );
    }),

  createTemplate: protectedProcedure
    .input(screenerTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("createTemplate", input);
      const created = await insertScreenerTemplate({
        organizationId: (ctx.user as { activeOrganizationId?: string | null })
          .activeOrganizationId,
        name: input.name,
        category: input.category,
        description: input.description || null,
        content: input.content || null,
        department: input.department || null,
      });

      return { screenerId: created?.id };
    }),

  updateTemplate: protectedProcedure
    .input(
      screenerTemplateSchema.extend({
        screenerId: z.string().min(1, "Screener ID is required"),
      }),
    )
    .mutation(async ({ input }) => {
      await updateScreenerTemplateById(input.screenerId, {
        name: input.name,
        category: input.category,
        description: input.description || null,
        content: input.content || null,
        department: input.department || null,
      });

      return { screenerId: input.screenerId };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ screenerId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await DeleteScreenerById(input.screenerId);

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

      const created = await insertScreenerQuestion({
        screenerId: input.screenerId,
        question: input.question,
        weight: input.weight,
        responseType: input.responseType,
        position: nextPosition,
      });

      return { questionId: created?.id };
    }),

  updateQuestion: protectedProcedure
    .input(screenerQuestionUpdateSchema)
    .mutation(async ({ input }) => {
      await updateScreenerQuestionById({
        id: input.id,
        screenerId: input.screenerId,
        question: input.question,
        weight: input.weight,
        responseType: input.responseType,
      });

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
      const removed = await DeleteScreenerQuestionById(
        input.screenerId,
        input.questionId,
      );
      if (removed === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "That question could not be deleted. It may still be saving—wait a moment and try again—or it was already removed.",
        });
      }

      const remaining = await listScreenerQuestionIdsOrdered(input.screenerId);

      if (remaining.length > 0) {
        await resequenceScreenerQuestionPositionsTx(input.screenerId, remaining);
      }

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

      await reorderScreenerQuestionsTx({
        screenerId: input.screenerId,
        questionIds: input.questionIds,
      });

      return { success: true };
    }),

  getResponses: protectedProcedure
    .input(
      z.object({
        dealOpportunityId: z.string().min(1),
        screenerId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = (ctx.user as { activeOrganizationId?: string | null })
        .activeOrganizationId;
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
    .mutation(async ({ ctx, input }) => {
      const organizationId = (ctx.user as { activeOrganizationId?: string | null })
        .activeOrganizationId;
      const screener = await getScreenerByIdForOrganization(
        input.screenerId,
        organizationId ?? null,
      );
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

      return {
        success: true,
        savedCount: saved.filter(Boolean).length,
      };
    }),
});
