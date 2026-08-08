import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  listCompanyNotesByCompanyId,
  insertCompanyNote,
  updateCompanyNoteById,
  deleteCompanyNoteById,
} from "@repo/db/mutations";

export const companyNotesRouter = createTRPCRouter({
  listByCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return listCompanyNotesByCompanyId(input.companyId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        title: z.string().min(1).optional(),
        content: z.string().min(1, "Note content is required"),
        dealUid: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const note = await insertCompanyNote({
        companyId: input.companyId,
        title: input.title ?? null,
        content: input.content,
        createdById: ctx.user.id,
      });

      return note;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().min(1, "Note content is required"),
        dealUid: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const updated = await updateCompanyNoteById({
        id: input.id,
        title: input.title ?? null,
        content: input.content,
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        dealUid: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const deleted = await deleteCompanyNoteById(input.id);

      return { success: true };
    }),
});
