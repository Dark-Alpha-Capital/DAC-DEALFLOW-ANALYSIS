import { createTRPCRouter, protectedProcedure } from "../init";
import db, {
  aiScreenings,
  companies,
  dealOpportunities,
  leads,
  themes,
  eq,
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
});
