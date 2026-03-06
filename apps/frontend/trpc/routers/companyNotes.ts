import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { companyNotes, eq } from "@repo/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { desc } from "drizzle-orm";

export const companyNotesRouter = createTRPCRouter({
  listByCompany: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(companyNotes)
        .where(eq(companyNotes.companyId, input.companyId))
        .orderBy(desc(companyNotes.createdAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        title: z.string().min(1).optional(),
        content: z.string().min(1, "Note content is required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [note] = await db
        .insert(companyNotes)
        .values({
          companyId: input.companyId,
          title: input.title ?? null,
          content: input.content,
          createdById: ctx.user.id,
        })
        .returning();

      revalidatePath(`/companies/${input.companyId}`);
      revalidateTag("companies", "max");
      revalidateTag(`company-${input.companyId}`, "max");

      return note;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().min(1, "Note content is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(companyNotes)
        .set({
          title: input.title ?? null,
          content: input.content,
        })
        .where(eq(companyNotes.id, input.id))
        .returning();

      if (updated) {
        revalidatePath(`/companies/${updated.companyId}`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${updated.companyId}`, "max");
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(companyNotes)
        .where(eq(companyNotes.id, input.id))
        .returning();

      if (deleted) {
        revalidatePath(`/companies/${deleted.companyId}`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${deleted.companyId}`, "max");
      }

      return { success: true };
    }),
});

