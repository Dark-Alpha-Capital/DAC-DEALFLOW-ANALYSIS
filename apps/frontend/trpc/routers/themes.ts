import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, {
  themes,
  theses,
  industryIntelligence,
  themePerformance,
  themeCompanyCoverage,
  companies,
  eq,
  and,
  isNull,
  asc,
  desc,
} from "@repo/db";
import { after } from "@/lib/after";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import { TRPCError } from "@trpc/server";

const themeStatuses = ["ACTIVE", "PAUSED", "RETIRED"] as const;
const companyCoverageStatuses = [
  "UNCONTACTED",
  "CONTACTED",
  "IN_DISCUSSION",
  "UNDER_LOI",
  "CLOSED",
  "PASSED",
] as const;

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

const thesisSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  summary: z.string().min(1, "Summary is required"),
  macroDrivers: z.array(z.string().min(1)).optional().default([]),
  mispricingHypothesis: z.string().optional(),
  valueCreationLevers: z.array(z.string().min(1)).optional().default([]),
  exitLogic: z.string().optional(),
  riskFactors: z.array(z.string().min(1)).optional().default([]),
  version: z.string().min(1, "Version is required"),
});

const industryIntelligenceSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  version: z.string().min(1, "Version is required"),
  tam: z.coerce.number().optional(),
  growthRate: z.coerce.number().optional(),
  avgEbitdaMargin: z.coerce.number().optional(),
  avgEntryMultiple: z.coerce.number().optional(),
  avgExitMultiple: z.coerce.number().optional(),
  fragmentationScore: z.coerce.number().int().optional(),
  sponsorPenetration: z.coerce.number().optional(),
  cyclicalityScore: z.coerce.number().int().optional(),
  disruptionRiskScore: z.coerce.number().int().optional(),
  notes: z.string().optional(),
});

const performanceSnapshotSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  observedAt: z.string().optional(),
  dealsSourced: z.coerce.number().int().optional(),
  meetingsHeld: z.coerce.number().int().optional(),
  loisIssued: z.coerce.number().int().optional(),
  dealsClosed: z.coerce.number().int().optional(),
  averageEntryMultiple: z.coerce.number().optional(),
  averageIRR: z.coerce.number().optional(),
});

const coverageUpsertSchema = z.object({
  themeId: z.string().min(1, "Theme ID is required"),
  companyId: z.string().min(1, "Company ID is required"),
  coverageStatus: z.enum(companyCoverageStatuses),
  lastOutreachAt: z.string().optional(),
  notes: z.string().optional(),
});

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
    return db
      .select({
        id: themes.id,
        name: themes.name,
        status: themes.status,
      })
      .from(themes)
      .where(isNull(themes.deletedAt))
      .orderBy(asc(themes.name));
  }),

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

      if (added?.id) scheduleRevalidateThemePaths(added.id);
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
        .where(and(eq(themes.id, id), isNull(themes.deletedAt)));

      scheduleRevalidateThemePaths(id);
      return { themeId: id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(themes)
        .set({ deletedAt: new Date() })
        .where(and(eq(themes.id, input.id), isNull(themes.deletedAt)));

      scheduleRevalidateThemePaths(input.id);
      return { success: true };
    }),

  thesisGetActive: protectedProcedure
    .input(z.object({ themeId: z.string().min(1) }))
    .query(async ({ input }) => {
      const [active] = await db
        .select()
        .from(theses)
        .where(
          and(eq(theses.themeId, input.themeId), eq(theses.isActive, true)),
        )
        .orderBy(desc(theses.createdAt))
        .limit(1);
      return active ?? null;
    }),

  thesisListVersions: protectedProcedure
    .input(z.object({ themeId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(theses)
        .where(eq(theses.themeId, input.themeId))
        .orderBy(desc(theses.createdAt));
    }),

  thesisCreateVersion: protectedProcedure
    .input(thesisSchema)
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx
          .update(theses)
          .set({ isActive: false })
          .where(
            and(eq(theses.themeId, input.themeId), eq(theses.isActive, true)),
          );

        await tx.insert(theses).values({
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
          isActive: true,
        });
      });

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  intelligenceGetActive: protectedProcedure
    .input(z.object({ themeId: z.string().min(1) }))
    .query(async ({ input }) => {
      const [active] = await db
        .select()
        .from(industryIntelligence)
        .where(
          and(
            eq(industryIntelligence.themeId, input.themeId),
            eq(industryIntelligence.isActive, true),
          ),
        )
        .orderBy(desc(industryIntelligence.createdAt))
        .limit(1);
      return active ?? null;
    }),

  intelligenceListVersions: protectedProcedure
    .input(z.object({ themeId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(industryIntelligence)
        .where(eq(industryIntelligence.themeId, input.themeId))
        .orderBy(desc(industryIntelligence.createdAt));
    }),

  intelligenceCreateVersion: protectedProcedure
    .input(industryIntelligenceSchema)
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        await tx
          .update(industryIntelligence)
          .set({ isActive: false })
          .where(
            and(
              eq(industryIntelligence.themeId, input.themeId),
              eq(industryIntelligence.isActive, true),
            ),
          );

        await tx.insert(industryIntelligence).values({
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
      });

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  performanceListSnapshots: protectedProcedure
    .input(z.object({ themeId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(themePerformance)
        .where(eq(themePerformance.themeId, input.themeId))
        .orderBy(
          desc(themePerformance.observedAt),
          desc(themePerformance.createdAt),
        );
    }),

  performanceCreateSnapshot: protectedProcedure
    .input(performanceSnapshotSchema)
    .mutation(async ({ input }) => {
      await db.insert(themePerformance).values({
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
    .input(z.object({ id: z.string().min(1), themeId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db
        .delete(themePerformance)
        .where(
          and(
            eq(themePerformance.id, input.id),
            eq(themePerformance.themeId, input.themeId),
          ),
        );

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),

  coverageList: protectedProcedure
    .input(z.object({ themeId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db
        .select({
          id: themeCompanyCoverage.id,
          themeId: themeCompanyCoverage.themeId,
          companyId: themeCompanyCoverage.companyId,
          coverageStatus: themeCompanyCoverage.coverageStatus,
          lastOutreachAt: themeCompanyCoverage.lastOutreachAt,
          notes: themeCompanyCoverage.notes,
          createdAt: themeCompanyCoverage.createdAt,
          updatedAt: themeCompanyCoverage.updatedAt,
          companyName: companies.name,
          companyIndustry: companies.industry,
          companyLocation: companies.location,
        })
        .from(themeCompanyCoverage)
        .innerJoin(companies, eq(themeCompanyCoverage.companyId, companies.id))
        .where(
          and(
            eq(themeCompanyCoverage.themeId, input.themeId),
            isNull(companies.deletedAt),
          ),
        )
        .orderBy(desc(themeCompanyCoverage.updatedAt));
    }),

  coverageUpsert: protectedProcedure
    .input(coverageUpsertSchema)
    .mutation(async ({ input }) => {
      const [company] = await db
        .select({ id: companies.id, themeId: companies.themeId })
        .from(companies)
        .where(
          and(eq(companies.id, input.companyId), isNull(companies.deletedAt)),
        )
        .limit(1);

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

      const [existing] = await db
        .select({ id: themeCompanyCoverage.id })
        .from(themeCompanyCoverage)
        .where(
          and(
            eq(themeCompanyCoverage.themeId, input.themeId),
            eq(themeCompanyCoverage.companyId, input.companyId),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(themeCompanyCoverage)
          .set({
            coverageStatus: input.coverageStatus,
            lastOutreachAt: input.lastOutreachAt
              ? new Date(input.lastOutreachAt)
              : null,
            notes: input.notes || null,
          })
          .where(eq(themeCompanyCoverage.id, existing.id));
      } else {
        await db.insert(themeCompanyCoverage).values({
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
    .input(z.object({ id: z.string().min(1), themeId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db
        .delete(themeCompanyCoverage)
        .where(
          and(
            eq(themeCompanyCoverage.id, input.id),
            eq(themeCompanyCoverage.themeId, input.themeId),
          ),
        );

      scheduleRevalidateThemePaths(input.themeId);
      return { themeId: input.themeId };
    }),
});
