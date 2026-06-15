import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { screenerTemplateSchema } from "@repo/schemas";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  getAllProjectScreeners,
  getScreenerById,
} from "@repo/db-tracker/queries";
import {
  deleteScreenerById,
  insertScreenerTemplate,
  updateScreenerTemplateById,
} from "@repo/db-tracker/mutations";

const projectScreenerSchema = screenerTemplateSchema.extend({
  category: z.literal("Project Screener"),
});

export const screenersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return getAllProjectScreeners();
  }),

  getById: protectedProcedure
    .input(z.object({ screenerId: z.string().min(1) }))
    .query(async ({ input }) => {
      const screener = await getScreenerById(input.screenerId);
      if (!screener) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Screener not found" });
      }
      return screener;
    }),

  createTemplate: protectedProcedure
    .input(projectScreenerSchema)
    .mutation(async ({ input }) => {
      const created = await insertScreenerTemplate({
        name: input.name,
        category: "Project Screener",
        description: input.description ?? null,
        content: input.content ?? null,
        department: input.department ?? null,
      });
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screener",
        });
      }
      return { screenerId: created.id };
    }),

  updateTemplate: protectedProcedure
    .input(
      projectScreenerSchema.extend({
        screenerId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { screenerId, ...values } = input;
      await updateScreenerTemplateById(screenerId, {
        name: values.name,
        category: "Project Screener",
        description: values.description ?? null,
        content: values.content ?? null,
        department: values.department ?? null,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ screenerId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await deleteScreenerById(input.screenerId);
      return { success: true };
    }),
});
