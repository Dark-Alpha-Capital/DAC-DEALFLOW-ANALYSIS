import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, {
  companies,
  dealOpportunities,
  themes,
  eq,
  and,
  isNull,
  ilike,
} from "@repo/db";
import {
  GetCompanyWithAllRelations,
  ListCompanyFinancialSnapshots,
} from "@repo/db/queries";
import { createCompanyFinancialSnapshot } from "@repo/db/mutations";
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { asc, desc } from "drizzle-orm";
import { upsertDealOpportunityScreening } from "@repo/deal-screening";

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
  coverageStatus: z
    .enum([
      "UNCONTACTED",
      "CONTACTED",
      "IN_DISCUSSION",
      "UNDER_LOI",
      "CLOSED",
      "PASSED",
    ])
    .optional(),
  businessModel: z.string().optional(),
  employees: z.coerce.number().optional(),
  revenueTtm: z.coerce.number().optional(),
  ebitdaTtm: z.coerce.number().optional(),
  grossMargin: z.coerce.number().optional(),
  revenueCagr: z.coerce.number().optional(),
  totalClients: z.coerce.number().optional(),
  top10Concentration: z.coerce.number().optional(),
  customerIndustries: z.array(z.string()).optional(),
  revenueModelType: z.string().optional(),
  expansionModel: z.string().optional(),
  concentrationHigh: z.boolean().optional(),
  marginLow: z.boolean().optional(),
  vendorDependency: z.boolean().optional(),
  growthLevers: z.array(z.string()).optional(),
});

const createCompanySchema = companySchema;

export const companiesRouter = createTRPCRouter({
  listForSelect: protectedProcedure.query(async () => {
    return db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(isNull(companies.deletedAt))
      .orderBy(asc(companies.name));
  }),

  searchForChat: protectedProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const query = input?.query?.trim();
      const limit = input?.limit ?? 20;

      const conditions = [isNull(companies.deletedAt)];
      if (query) {
        conditions.push(ilike(companies.name, `%${query}%`));
      }

      return db
        .select({
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          location: companies.location,
        })
        .from(companies)
        .where(and(...conditions))
        .orderBy(query ? asc(companies.name) : desc(companies.updatedAt))
        .limit(limit);
    }),

  getWithRelations: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const result = await GetCompanyWithAllRelations(input.id);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }
      return result;
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
          businessModel: input.businessModel || null,
          employees: input.employees ?? null,
          revenueTtm: input.revenueTtm ?? null,
          ebitdaTtm: input.ebitdaTtm ?? null,
          grossMargin: input.grossMargin ?? null,
          revenueCagr: input.revenueCagr ?? null,
          totalClients: input.totalClients ?? null,
          top10Concentration: input.top10Concentration ?? null,
          customerIndustries: input.customerIndustries ?? null,
          revenueModelType: input.revenueModelType || null,
          expansionModel: input.expansionModel || null,
          concentrationHigh: input.concentrationHigh ?? null,
          marginLow: input.marginLow ?? null,
          vendorDependency: input.vendorDependency ?? null,
          growthLevers: input.growthLevers ?? null,
        })
        .returning();

      after(async () => {
        revalidatePath("/companies");
        revalidateTag("companies", "max");
      });
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
          businessModel: data.businessModel || null,
          employees: data.employees ?? null,
          revenueTtm: data.revenueTtm ?? null,
          ebitdaTtm: data.ebitdaTtm ?? null,
          grossMargin: data.grossMargin ?? null,
          revenueCagr: data.revenueCagr ?? null,
          totalClients: data.totalClients ?? null,
          top10Concentration: data.top10Concentration ?? null,
          customerIndustries: data.customerIndustries ?? null,
          revenueModelType: data.revenueModelType || null,
          expansionModel: data.expansionModel || null,
          concentrationHigh: data.concentrationHigh ?? null,
          marginLow: data.marginLow ?? null,
          vendorDependency: data.vendorDependency ?? null,
          growthLevers: data.growthLevers ?? null,
        })
        .where(and(eq(companies.id, id), isNull(companies.deletedAt)));

      const companyOpportunities = await db
        .select({ id: dealOpportunities.id })
        .from(dealOpportunities)
        .where(eq(dealOpportunities.companyId, id));

      await Promise.all(
        companyOpportunities.map((opp) => upsertDealOpportunityScreening(opp.id)),
      );

      after(async () => {
        revalidatePath("/companies");
        revalidatePath(`/companies/${id}`);
        revalidatePath(`/companies/${id}/edit`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${id}`, "max");
      });
      return { companyId: id };
    }),

  assignTheme: protectedProcedure
    .input(
      z.object({
        companyId: z.string().min(1, "Company ID is required"),
        themeId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const normalizedThemeId = input.themeId?.trim() || null;

      if (normalizedThemeId) {
        const [theme] = await db
          .select({ id: themes.id })
          .from(themes)
          .where(
            and(eq(themes.id, normalizedThemeId), isNull(themes.deletedAt)),
          )
          .limit(1);

        if (!theme) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected theme does not exist",
          });
        }
      }

      await db
        .update(companies)
        .set({
          themeId: normalizedThemeId,
        })
        .where(
          and(eq(companies.id, input.companyId), isNull(companies.deletedAt)),
        );

      after(async () => {
        revalidatePath("/companies");
        revalidatePath(`/companies/${input.companyId}`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${input.companyId}`, "max");
      });
      return { companyId: input.companyId, themeId: normalizedThemeId };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(companies)
        .set({ deletedAt: new Date() })
        .where(and(eq(companies.id, input.id), isNull(companies.deletedAt)));
      after(async () => {
        revalidatePath("/companies");
        revalidateTag("companies", "max");
        revalidateTag(`company-${input.id}`, "max");
      });
      return { success: true };
    }),

  financialSnapshots: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({ companyId: z.string() }))
      .query(async ({ input }) => {
        return ListCompanyFinancialSnapshots(input.companyId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          companyId: z.string(),
          periodEnd: z.coerce.date(),
          revenue: z.coerce.number().optional(),
          ebitda: z.coerce.number().optional(),
          grossMargin: z.coerce.number().optional(),
          revenueCagr: z.coerce.number().optional(),
          employees: z.coerce.number().optional(),
          totalClients: z.coerce.number().optional(),
          top10Concentration: z.coerce.number().optional(),
          recurringRevenuePct: z.coerce.number().optional(),
          source: z.enum(["MANAGEMENT", "CIM", "MANUAL"]),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const snapshot = await createCompanyFinancialSnapshot({
          companyId: input.companyId,
          periodEnd: input.periodEnd,
          revenue: input.revenue ?? null,
          ebitda: input.ebitda ?? null,
          grossMargin: input.grossMargin ?? null,
          revenueCagr: input.revenueCagr ?? null,
          employees: input.employees ?? null,
          totalClients: input.totalClients ?? null,
          top10Concentration: input.top10Concentration ?? null,
          recurringRevenuePct: input.recurringRevenuePct ?? null,
          source: input.source,
          notes: input.notes ?? null,
          createdById: ctx.session.user.id,
        });
        after(async () => {
          revalidatePath("/companies");
          revalidatePath(`/companies/${input.companyId}`);
          revalidateTag("companies", "max");
          revalidateTag(`company-${input.companyId}`, "max");
        });
        return { snapshot };
      }),
  }),
});
