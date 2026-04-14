import { createTRPCRouter, protectedProcedure } from "../init";
import {
  coverageUpsertSchema,
  createThemeSchema,
  industryIntelligenceSchema,
  performanceSnapshotSchema,
  thesisByIdAndThemeInputSchema,
  thesisSchema,
  themeByIdInputSchema,
  themeIdMinInputSchema,
  updateThemeSchema,
} from "@/lib/zod-schemas/themes-router";
import {
  listThemesForSelect,
  getActiveThesisForTheme,
  listThesisVersionsForTheme,
  getActiveIndustryIntelligenceForTheme,
  listIndustryIntelligenceVersionsForTheme,
  listThemePerformanceSnapshots,
  listThemeCoverageRows,
} from "@repo/db/queries";
import {
  insertThemeRow,
  updateThemeById,
  softDeleteThemeById,
  thesisCreateVersionTx,
  intelligenceCreateVersionTx,
  insertThemePerformanceSnapshot,
  deleteThemePerformanceSnapshot,
  getCompanyThemeForCoverage,
  findThemeCoverageRow,
  updateThemeCoverageById,
  insertThemeCoverageRow,
  deleteThemeCoverageRow,
} from "@repo/db/mutations";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import { TRPCError } from "@trpc/server";

function scheduleRevalidateThemePaths(themeId: string) {
  after(async () => {
    revalidatePath("/investment-themes");
    revalidatePath(`/investment-themes/${themeId}`);
    revalidatePath(`/investment-themes/${themeId}/edit`);
    revalidateTag("themes", "max");
    revalidateTag(`theme-${themeId}`, "max");
  });
}

export const themesRouter = createTRPCRouter({
  listForSelect: protectedProcedure.query(async () => {
    return listThemesForSelect();
  }),

  create: protectedProcedure
    .input(createThemeSchema)
    .mutation(async ({ input, ctx }) => {
      const added = await insertThemeRow({
        name: input.name,
        description: input.description,
        sector: input.sector,
        status: input.status ?? "ACTIVE",
        capitalPriorityScore: input.capitalPriorityScore ?? null,
        confidenceScore: input.confidenceScore ?? null,
        createdById: ctx.user.id,
      });

      if (added?.id) scheduleRevalidateThemePaths(added.id);
      return { themeId: added?.id };
    }),

  update: protectedProcedure
    .input(updateThemeSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateThemeById(id, {
        name: data.name,
        description: data.description,
        sector: data.sector,
        status: data.status ?? "ACTIVE",
        capitalPriorityScore: data.capitalPriorityScore ?? null,
        confidenceScore: data.confidenceScore ?? null,
      });

      scheduleRevalidateThemePaths(id);
      return { themeId: id };
    }),

  delete: protectedProcedure
    .input(themeByIdInputSchema)
    .mutation(async ({ input }) => {
      await softDeleteThemeById(input.id);

      scheduleRevalidateThemePaths(input.id);
      return { success: true };
    }),

  thesisGetActive: protectedProcedure
    .input(themeIdMinInputSchema)
    .query(async ({ input }) => {
      return getActiveThesisForTheme(input.themeId);
    }),

  thesisListVersions: protectedProcedure
    .input(themeIdMinInputSchema)
    .query(async ({ input }) => {
      return listThesisVersionsForTheme(input.themeId);
    }),

  thesisCreateVersion: protectedProcedure
    .input(thesisSchema)
    .mutation(async ({ input }) => {
      await thesisCreateVersionTx({
        themeId: input.themeId,
        summary: input.summary,
        macroDrivers: input.macroDrivers.length ? input.macroDrivers : null,
        mispricingHypothesis: input.mispricingHypothesis || null,
        valueCreationLevers: input.valueCreationLevers.length
          ? input.valueCreationLevers
          : null,
        exitLogic: input.exitLogic || null,
        riskFactors: input.riskFactors.length ? input.riskFactors : null,
        version: input.version,
      });

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  intelligenceGetActive: protectedProcedure
    .input(themeIdMinInputSchema)
    .query(async ({ input }) => {
      return getActiveIndustryIntelligenceForTheme(input.themeId);
    }),

  intelligenceListVersions: protectedProcedure
    .input(themeIdMinInputSchema)
    .query(async ({ input }) => {
      return listIndustryIntelligenceVersionsForTheme(input.themeId);
    }),

  intelligenceCreateVersion: protectedProcedure
    .input(industryIntelligenceSchema)
    .mutation(async ({ input }) => {
      await intelligenceCreateVersionTx({
        themeId: input.themeId,
        version: input.version,
        tam: input.tam ?? null,
        growthRate: input.growthRate ?? null,
        avgEbitdaMargin: input.avgEbitdaMargin ?? null,
        avgEntryMultiple: input.avgEntryMultiple ?? null,
        avgExitMultiple: input.avgExitMultiple ?? null,
        fragmentationScore: input.fragmentationScore ?? null,
        sponsorPenetration: input.sponsorPenetration ?? null,
        cyclicalityScore: input.cyclicalityScore ?? null,
        disruptionRiskScore: input.disruptionRiskScore ?? null,
        notes: input.notes || null,
        isActive: true,
      });

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  performanceListSnapshots: protectedProcedure
    .input(themeIdMinInputSchema)
    .query(async ({ input }) => {
      return listThemePerformanceSnapshots(input.themeId);
    }),

  performanceCreateSnapshot: protectedProcedure
    .input(performanceSnapshotSchema)
    .mutation(async ({ input }) => {
      await insertThemePerformanceSnapshot({
        themeId: input.themeId,
        observedAt: input.observedAt ? new Date(input.observedAt) : new Date(),
        dealsSourced: input.dealsSourced ?? null,
        meetingsHeld: input.meetingsHeld ?? null,
        loisIssued: input.loisIssued ?? null,
        dealsClosed: input.dealsClosed ?? null,
        averageEntryMultiple: input.averageEntryMultiple ?? null,
        averageIRR: input.averageIRR ?? null,
      });

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  performanceDeleteSnapshot: protectedProcedure
    .input(thesisByIdAndThemeInputSchema)
    .mutation(async ({ input }) => {
      await deleteThemePerformanceSnapshot(input.themeId, input.id);

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  coverageList: protectedProcedure
    .input(themeIdMinInputSchema)
    .query(async ({ input }) => {
      return listThemeCoverageRows(input.themeId);
    }),

  coverageUpsert: protectedProcedure
    .input(coverageUpsertSchema)
    .mutation(async ({ input }) => {
      const company = await getCompanyThemeForCoverage(
        input.companyId,
        input.themeId,
      );

      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      if (company.themeId !== input.themeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Company is not linked to this theme",
        });
      }

      const existing = await findThemeCoverageRow(input.themeId, input.companyId);

      if (existing) {
        await updateThemeCoverageById(existing.id, {
          coverageStatus: input.coverageStatus,
          lastOutreachAt: input.lastOutreachAt
            ? new Date(input.lastOutreachAt)
            : null,
          notes: input.notes || null,
        });
      } else {
        await insertThemeCoverageRow({
          themeId: input.themeId,
          companyId: input.companyId,
          coverageStatus: input.coverageStatus,
          lastOutreachAt: input.lastOutreachAt
            ? new Date(input.lastOutreachAt)
            : null,
          notes: input.notes || null,
        });
      }

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId, companyId: input.companyId };
    }),

  coverageRemove: protectedProcedure
    .input(thesisByIdAndThemeInputSchema)
    .mutation(async ({ input }) => {
      await deleteThemeCoverageRow(input.themeId, input.id);

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),
});
