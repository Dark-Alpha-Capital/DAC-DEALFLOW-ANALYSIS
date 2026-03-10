import { createTRPCRouter, protectedProcedure } from "../init";
import { z } from "zod";
import db, {
  aiScreenings,
  companies,
  dealOpportunities,
  dealOpportunityScreenings,
  leads,
  themes,
  eq,
  desc,
} from "@repo/db";
import { isNotNull, isNull } from "drizzle-orm";

export const analyticsRouter = createTRPCRouter({
  /**
   * Deals by theme (number of deal opportunities per theme).
   */
  dealsByTheme: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        themeId: themes.id,
        themeName: themes.name,
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .leftJoin(themes, eq(companies.themeId, themes.id))
      .where(isNull(companies.deletedAt));

    const counts = new Map<
      string,
      { themeId: string | null; themeName: string; count: number }
    >();

    for (const row of rows) {
      const key = row.themeId ?? "unassigned";
      const themeName = row.themeName ?? "Unassigned";
      const current = counts.get(key) ?? {
        themeId: row.themeId,
        themeName,
        count: 0,
      };
      current.count += 1;
      counts.set(key, current);
    }

    const result = Array.from(counts.values());
    result.sort((a, b) => b.count - a.count);

    return result;
  }),

  /**
   * Pipeline conversion: count of deal opportunities by stage.
   */
  pipelineConversion: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        stage: dealOpportunities.stage,
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(isNull(companies.deletedAt));

    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.stage ?? "UNKNOWN";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const stageOrder = [
      "LISTED",
      "INITIAL_REVIEW",
      "SCREENED",
      "MEETING_HELD",
      "IOI_SUBMITTED",
      "LOI_SUBMITTED",
      "DILIGENCE",
      "CLOSED",
      "DEAD",
      "UNKNOWN",
    ] as const;

    const result = stageOrder
      .map((stage) => ({
        stage,
        count: counts.get(stage) ?? 0,
      }))
      .filter((row) => row.count > 0);

    return result;
  }),

  /**
   * Source performance: leads and deal opportunities per source website.
   */
  sourcePerformance: protectedProcedure.query(async () => {
    const [leadRows, oppRows] = await Promise.all([
      db
        .select({
          source: leads.sourceWebsite,
        })
        .from(leads)
        .where(isNull(leads.deletedAt)),
      db
        .select({
          source: dealOpportunities.sourceWebsite,
        })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(isNull(companies.deletedAt)),
    ]);

    type SourceRow = { source: string; leads: number; deals: number };
    const bySource = new Map<string, SourceRow>();

    const normalize = (source: string | null) => {
      const trimmed = (source ?? "").trim();
      return trimmed === "" ? "Unknown" : trimmed;
    };

    for (const row of leadRows) {
      const key = normalize(row.source);
      const current = bySource.get(key) ?? {
        source: key,
        leads: 0,
        deals: 0,
      };
      current.leads += 1;
      bySource.set(key, current);
    }

    for (const row of oppRows) {
      const key = normalize(row.source);
      const current = bySource.get(key) ?? {
        source: key,
        leads: 0,
        deals: 0,
      };
      current.deals += 1;
      bySource.set(key, current);
    }

    const result = Array.from(bySource.values());
    result.sort(
      (a, b) => b.leads + b.deals - (a.leads + a.deals),
    );

    return result;
  }),

  /**
   * Screening scores: distribution of AI screening scores into buckets.
   */
  screeningScores: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        score: aiScreenings.score,
      })
      .from(aiScreenings)
      .where(isNotNull(aiScreenings.score));

    const buckets = [
      { id: "0-24", label: "0–24", min: 0, max: 24 },
      { id: "25-49", label: "25–49", min: 25, max: 49 },
      { id: "50-74", label: "50–74", min: 50, max: 74 },
      { id: "75-100", label: "75–100", min: 75, max: 100 },
    ] as const;

    const counts = new Map<string, number>();
    for (const bucket of buckets) {
      counts.set(bucket.id, 0);
    }

    for (const row of rows) {
      const score = row.score ?? 0;
      const bucket =
        buckets.find((b) => score >= b.min && score <= b.max) ??
        buckets[buckets.length - 1];
      counts.set(bucket.id, (counts.get(bucket.id) ?? 0) + 1);
    }

    const result = buckets
      .map((bucket) => ({
        bucket: bucket.label,
        id: bucket.id,
        count: counts.get(bucket.id) ?? 0,
      }))
      .filter((row) => row.count > 0);

    return result;
  }),

  /**
   * Pipeline overview for global dashboard.
   * Includes deals by stage, lead flow by status, and headline lead KPIs.
   */
  pipelineOverview: protectedProcedure.query(async () => {
    const [stageRows, leadRows] = await Promise.all([
      db
        .select({
          stage: dealOpportunities.stage,
        })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(isNull(companies.deletedAt)),
      db
        .select({
          status: leads.status,
        })
        .from(leads)
        .where(isNull(leads.deletedAt)),
    ]);

    const stageOrder = [
      "LISTED",
      "INITIAL_REVIEW",
      "SCREENED",
      "MEETING_HELD",
      "IOI_SUBMITTED",
      "LOI_SUBMITTED",
      "DILIGENCE",
      "CLOSED",
      "DEAD",
      "UNKNOWN",
    ] as const;

    const leadStatusOrder = [
      "NEW",
      "PROCESSED",
      "DUPLICATE",
      "REJECTED",
      "UNKNOWN",
    ] as const;

    const stageCounts = new Map<string, number>();
    for (const row of stageRows) {
      const key = row.stage ?? "UNKNOWN";
      stageCounts.set(key, (stageCounts.get(key) ?? 0) + 1);
    }

    const leadCounts = new Map<string, number>();
    for (const row of leadRows) {
      const key = row.status ?? "UNKNOWN";
      leadCounts.set(key, (leadCounts.get(key) ?? 0) + 1);
    }

    const dealsByStage = stageOrder.map((stage) => ({
      stage,
      count: stageCounts.get(stage) ?? 0,
    }));

    const leadFlow = leadStatusOrder.map((status) => ({
      status,
      count: leadCounts.get(status) ?? 0,
    }));

    return {
      dealsByStage,
      leadFlow,
      kpis: {
        newLeads: leadCounts.get("NEW") ?? 0,
        processedLeads: leadCounts.get("PROCESSED") ?? 0,
        duplicates: leadCounts.get("DUPLICATE") ?? 0,
      },
    };
  }),

  /**
   * Theme overview for global dashboard.
   * Includes active themes plus company/deal concentration by theme.
   */
  themeOverview: protectedProcedure.query(async () => {
    const [themeRows, companyRows, dealRows] = await Promise.all([
      db
        .select({
          id: themes.id,
          status: themes.status,
          deletedAt: themes.deletedAt,
        })
        .from(themes),
      db
        .select({
          themeId: themes.id,
          themeName: themes.name,
          themeDeletedAt: themes.deletedAt,
        })
        .from(companies)
        .leftJoin(themes, eq(companies.themeId, themes.id))
        .where(isNull(companies.deletedAt)),
      db
        .select({
          themeId: themes.id,
          themeName: themes.name,
          themeDeletedAt: themes.deletedAt,
        })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .leftJoin(themes, eq(companies.themeId, themes.id))
        .where(isNull(companies.deletedAt)),
    ]);

    const activeThemes = themeRows.filter((theme) =>
      theme.status === "ACTIVE" && theme.deletedAt == null
    ).length;

    const companyCounts = new Map<
      string,
      { themeId: string | null; themeName: string; count: number }
    >();
    for (const row of companyRows) {
      const isUnassigned = !row.themeId || row.themeDeletedAt != null;
      const key = isUnassigned ? "unassigned" : (row.themeId ?? "unassigned");
      const themeName = isUnassigned ? "Unassigned" : (row.themeName ?? "Unassigned");
      const current = companyCounts.get(key) ?? {
        themeId: isUnassigned ? null : row.themeId,
        themeName,
        count: 0,
      };
      current.count += 1;
      companyCounts.set(key, current);
    }

    const dealCounts = new Map<
      string,
      { themeId: string | null; themeName: string; count: number }
    >();
    for (const row of dealRows) {
      const isUnassigned = !row.themeId || row.themeDeletedAt != null;
      const key = isUnassigned ? "unassigned" : (row.themeId ?? "unassigned");
      const themeName = isUnassigned ? "Unassigned" : (row.themeName ?? "Unassigned");
      const current = dealCounts.get(key) ?? {
        themeId: isUnassigned ? null : row.themeId,
        themeName,
        count: 0,
      };
      current.count += 1;
      dealCounts.set(key, current);
    }

    const companiesPerTheme = Array.from(companyCounts.values()).sort(
      (a, b) => b.count - a.count,
    );
    const dealsPerTheme = Array.from(dealCounts.values()).sort(
      (a, b) => b.count - a.count,
    );

    return {
      activeThemes,
      companiesPerTheme,
      dealsPerTheme,
    };
  }),

  /**
   * Top deals ranked by deterministic screening score.
   */
  topDealsByLatestScreening: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db
        .select({
          dealOpportunityId: dealOpportunities.id,
          score: dealOpportunityScreenings.score,
          screenedAt: dealOpportunityScreenings.screenedAt,
          status: dealOpportunityScreenings.status,
          stage: dealOpportunities.stage,
          companyName: companies.name,
          companyDeletedAt: companies.deletedAt,
          themeName: themes.name,
          themeDeletedAt: themes.deletedAt,
        })
        .from(dealOpportunityScreenings)
        .innerJoin(
          dealOpportunities,
          eq(dealOpportunityScreenings.dealOpportunityId, dealOpportunities.id),
        )
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .leftJoin(themes, eq(companies.themeId, themes.id))
        .where(eq(dealOpportunityScreenings.status, "PASS"))
        .orderBy(
          desc(dealOpportunityScreenings.score),
          desc(dealOpportunityScreenings.screenedAt),
        );

      const latestByDeal = new Map<
        string,
        {
          dealOpportunityId: string;
          latestScore: number;
          latestScreenedAt: Date;
          stage: string;
          companyName: string;
          themeName: string | null;
        }
      >();

      for (const row of rows) {
        if (!row.dealOpportunityId || row.score == null || !row.screenedAt)
          continue;
        if (!row.companyName) continue;
        if (row.companyDeletedAt != null) continue;
        if (row.stage == null) continue;
        if (latestByDeal.has(row.dealOpportunityId)) continue;

        latestByDeal.set(row.dealOpportunityId, {
          dealOpportunityId: row.dealOpportunityId,
          latestScore: row.score,
          latestScreenedAt: row.screenedAt,
          stage: row.stage,
          companyName: row.companyName,
          themeName: row.themeDeletedAt ? null : row.themeName,
        });
      }

      const ranked = Array.from(latestByDeal.values())
        .sort(
          (a, b) =>
            b.latestScore - a.latestScore ||
            b.latestScreenedAt.getTime() - a.latestScreenedAt.getTime(),
        )
        .slice(0, input.limit);

      return ranked;
    }),
});
