import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { themes } from "db";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";

const themeStatuses = ["ACTIVE", "PAUSED", "RETIRED"] as const;

const createThemeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  sector: z.string().min(1, "Sector is required"),
  status: z.enum(themeStatuses).optional(),
  capitalPriorityScore: z.coerce.number().min(0).max(100).optional(),
  confidenceScore: z.coerce.number().optional(),
});

const updateThemeSchema = createThemeSchema.extend({
  id: z.string().min(1, "Theme ID is required"),
});

export const themesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createThemeSchema)
    .mutation(async ({ input, ctx }) => {
      const [added] = await db
        .insert(themes)
        .values({
          name: input.name,
          description: input.description,
          sector: input.sector,
          status: input.status ?? "ACTIVE",
          capitalPriorityScore: input.capitalPriorityScore ?? null,
          confidenceScore: input.confidenceScore ?? null,
          createdById: ctx.user.id,
        })
        .returning();

      revalidatePath("/themes");
      revalidateTag("themes", "max");
      return { themeId: added?.id };
    }),

  update: protectedProcedure
    .input(updateThemeSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db
        .update(themes)
        .set({
          name: data.name,
          description: data.description,
          sector: data.sector,
          status: data.status ?? "ACTIVE",
          capitalPriorityScore: data.capitalPriorityScore ?? null,
          confidenceScore: data.confidenceScore ?? null,
        })
        .where(eq(themes.id, id));

      revalidatePath("/themes");
      revalidatePath(`/themes/${id}`);
      revalidatePath(`/themes/${id}/edit`);
      revalidateTag("themes", "max");
      revalidateTag(`theme-${id}`, "max");
      return { themeId: id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(themes).where(eq(themes.id, input.id));
      revalidatePath("/themes");
      revalidateTag("themes", "max");
      revalidateTag(`theme-${input.id}`, "max");
      return { success: true };
    }),
});
