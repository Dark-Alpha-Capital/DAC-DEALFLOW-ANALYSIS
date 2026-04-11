import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  companyByIdInputSchema,
  companyFinancialSnapshotsListInputSchema,
  createCompanyFinancialSnapshotSchema,
  createCompanySchema,
  deleteCompanyInputSchema,
  searchForChatCompaniesInputSchema,
  updateCompanySchema,
} from "@/lib/zod-schemas/companies-router";
import {
  GetCompanyWithAllRelations,
  ListCompanyFinancialSnapshots,
  listCompaniesForSelect,
  searchCompaniesForChat,
} from "@repo/db/queries";
import {
  createCompanyFinancialSnapshot,
  insertCompanyRow,
  updateCompanyById,
  softDeleteCompanyById,
} from "@repo/db/mutations";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";

export const companiesRouter = createTRPCRouter({
  listForSelect: protectedProcedure.query(async () => {
    return listCompaniesForSelect();
  }),

  searchForChat: protectedProcedure
    .input(searchForChatCompaniesInputSchema)
    .query(async ({ input }) => {
      const query = input?.query?.trim();
      const limit = input?.limit ?? 20;
      return searchCompaniesForChat({ query, limit });
    }),

  getWithRelations: protectedProcedure
    .input(companyByIdInputSchema)
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
      const added = await insertCompanyRow({
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
      });

      after(async () => {
        revalidatePath("/companies");
        revalidateTag("companies", "max");
      });
      return { companyId: added?.id };
    }),

  update: protectedProcedure
    .input(updateCompanySchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCompanyById(id, {
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
      });

      after(async () => {
        revalidatePath("/companies");
        revalidatePath(`/companies/${id}`);
        revalidatePath(`/companies/${id}/edit`);
        revalidateTag("companies", "max");
        revalidateTag(`company-${id}`, "max");
      });
      return { companyId: id };
    }),

  delete: protectedProcedure
    .input(deleteCompanyInputSchema)
    .mutation(async ({ input }) => {
      await softDeleteCompanyById(input.id);
      after(async () => {
        revalidatePath("/companies");
        revalidateTag("companies", "max");
        revalidateTag(`company-${input.id}`, "max");
      });
      return { success: true };
    }),

  financialSnapshots: createTRPCRouter({
    list: protectedProcedure
      .input(companyFinancialSnapshotsListInputSchema)
      .query(async ({ input }) => {
        return ListCompanyFinancialSnapshots(input.companyId);
      }),

    create: protectedProcedure
      .input(createCompanyFinancialSnapshotSchema)
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
