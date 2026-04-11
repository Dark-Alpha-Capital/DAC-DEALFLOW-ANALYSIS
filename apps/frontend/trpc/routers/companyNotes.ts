import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  listCompanyNotesByCompanyId,
  insertCompanyNote,
  updateCompanyNoteById,
  deleteCompanyNoteById,
} from "@repo/db/mutations";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";

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

      after(async () => {
        revalidatePath(`/companies/${input.companyId}`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${input.companyId}`, "max");
        if (input.dealUid) revalidateTag(`deal-${input.dealUid}`, "max");
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

      if (updated) {
        after(async () => {
          revalidatePath(`/companies/${updated.companyId}`);
          revalidateTag("companies", "max");
          revalidateTag(`company-${updated.companyId}`, "max");
          if (input.dealUid) revalidateTag(`deal-${input.dealUid}`, "max");
        });
      }
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

      if (deleted) {
        after(async () => {
          revalidatePath(`/companies/${deleted.companyId}`);
          revalidateTag("companies", "max");
          revalidateTag(`company-${deleted.companyId}`, "max");
          if (input.dealUid) revalidateTag(`deal-${input.dealUid}`, "max");
        });
      }
      return { success: true };
    }),
});
