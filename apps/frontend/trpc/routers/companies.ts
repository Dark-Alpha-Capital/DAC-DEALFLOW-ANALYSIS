import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { companies, eq } from "db";
import { revalidatePath, revalidateTag } from "next/cache";
import { asc } from "drizzle-orm";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  normalizedName: z.string().min(1, "Normalized name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: z.coerce.number().optional(),
  ebitdaEstimate: z.coerce.number().optional(),
  ebitdaMarginEstimate: z.coerce.number().optional(),
  recurringRevenuePct: z.coerce.number().optional(),
  customerConcentrationPct: z.coerce.number().optional(),
  founderAgeEstimate: z.coerce.number().optional(),
  themeId: z.string().optional(),
  attractivenessScore: z.coerce.number().optional(),
  coverageStatus: z.enum([
    "UNCONTACTED",
    "CONTACTED",
    "IN_DISCUSSION",
    "UNDER_LOI",
    "CLOSED",
    "PASSED",
  ]).optional(),
});

const createCompanySchema = companySchema;

export const companiesRouter = createTRPCRouter({
  listForSelect: protectedProcedure.query(async () => {
    return db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .orderBy(asc(companies.name));
  }),

  create: protectedProcedure
    .input(createCompanySchema)
    .mutation(async ({ input }) => {
      const [added] = await db
        .insert(companies)
        .values({
          name: input.name,
          normalizedName: input.normalizedName,
          industry: input.industry || null,
          location: input.location || null,
          revenueEstimate: input.revenueEstimate ?? null,
          ebitdaEstimate: input.ebitdaEstimate ?? null,
          ebitdaMarginEstimate: input.ebitdaMarginEstimate ?? null,
          recurringRevenuePct: input.recurringRevenuePct ?? null,
          customerConcentrationPct: input.customerConcentrationPct ?? null,
          founderAgeEstimate: input.founderAgeEstimate ?? null,
          themeId: input.themeId || null,
          attractivenessScore: input.attractivenessScore ?? null,
          coverageStatus: input.coverageStatus ?? "UNCONTACTED",
        })
        .returning();

      revalidatePath("/companies");
      revalidateTag("companies", "max");
      return { companyId: added?.id };
    }),

  update: protectedProcedure
    .input(companySchema.extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db
        .update(companies)
        .set({
          name: data.name,
          normalizedName: data.normalizedName,
          industry: data.industry || null,
          location: data.location || null,
          revenueEstimate: data.revenueEstimate ?? null,
          ebitdaEstimate: data.ebitdaEstimate ?? null,
          ebitdaMarginEstimate: data.ebitdaMarginEstimate ?? null,
          recurringRevenuePct: data.recurringRevenuePct ?? null,
          customerConcentrationPct: data.customerConcentrationPct ?? null,
          founderAgeEstimate: data.founderAgeEstimate ?? null,
          themeId: data.themeId || null,
          attractivenessScore: data.attractivenessScore ?? null,
          coverageStatus: data.coverageStatus ?? "UNCONTACTED",
        })
        .where(eq(companies.id, id));

      revalidatePath("/companies");
      revalidatePath(`/companies/${id}`);
      revalidatePath(`/companies/${id}/edit`);
      revalidateTag("companies", "max");
      revalidateTag(`company-${id}`, "max");
      return { companyId: id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(companies).where(eq(companies.id, input.id));
      revalidatePath("/companies");
      revalidateTag("companies", "max");
      revalidateTag(`company-${input.id}`, "max");
      return { success: true };
    }),

});
