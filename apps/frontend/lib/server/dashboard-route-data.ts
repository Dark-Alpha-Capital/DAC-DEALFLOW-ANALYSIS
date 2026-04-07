import { createServerFn } from "@tanstack/react-start";
import { assertAuthenticated } from "@/lib/server/assert-session";
import db, {
  companies,
  dealOpportunities,
  dealOpportunityThemes,
  eq,
  leads,
  themes,
  isNull,
} from "@repo/db";
import { GetTopRankedDeals } from "@repo/db/queries";

async function getPipelineData() {
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
}

async function getThemesData() {
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
      .from(dealOpportunityThemes)
      .innerJoin(
        dealOpportunities,
        eq(dealOpportunityThemes.dealOpportunityId, dealOpportunities.id),
      )
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .leftJoin(themes, eq(dealOpportunityThemes.themeId, themes.id))
      .where(isNull(companies.deletedAt)),
    db
      .select({
        themeId: themes.id,
        themeName: themes.name,
        themeDeletedAt: themes.deletedAt,
      })
      .from(dealOpportunities)
      .leftJoin(
        dealOpportunityThemes,
        eq(dealOpportunityThemes.dealOpportunityId, dealOpportunities.id),
      )
      .leftJoin(themes, eq(dealOpportunityThemes.themeId, themes.id))
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(isNull(companies.deletedAt)),
  ]);

  const activeThemes = themeRows.filter(
    (theme) => theme.status === "ACTIVE" && theme.deletedAt == null,
  ).length;

  const companyCounts = new Map<
    string,
    { themeId: string | null; themeName: string; count: number }
  >();
  for (const row of companyRows) {
    const isUnassigned = !row.themeId || row.themeDeletedAt != null;
    const key = isUnassigned ? "unassigned" : (row.themeId ?? "unassigned");
    const themeName = isUnassigned
      ? "Unassigned"
      : (row.themeName ?? "Unassigned");
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
    const themeName = isUnassigned
      ? "Unassigned"
      : (row.themeName ?? "Unassigned");
    const current = dealCounts.get(key) ?? {
      themeId: isUnassigned ? null : row.themeId,
      themeName,
      count: 0,
    };
    current.count += 1;
    dealCounts.set(key, current);
  }

  return {
    activeThemes,
    companiesPerTheme: Array.from(companyCounts.values()).sort(
      (a, b) => b.count - a.count,
    ),
    dealsPerTheme: Array.from(dealCounts.values()).sort(
      (a, b) => b.count - a.count,
    ),
  };
}

async function getTopDealsData(limit = 10) {
  const [rows, companyThemeRows] = await Promise.all([
    GetTopRankedDeals(limit),
    db
      .select({
        companyName: companies.name,
        themeName: themes.name,
        themeDeletedAt: themes.deletedAt,
      })
      .from(dealOpportunities)
      .innerJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .leftJoin(
        dealOpportunityThemes,
        eq(dealOpportunityThemes.dealOpportunityId, dealOpportunities.id),
      )
      .leftJoin(themes, eq(dealOpportunityThemes.themeId, themes.id))
      .where(isNull(companies.deletedAt)),
  ]);

  const themeByCompany = new Map(
    companyThemeRows.map((row) => [
      row.companyName,
      row.themeDeletedAt ? null : row.themeName,
    ]),
  );

  return rows.map((row) => ({
    dealOpportunityId: row.dealOpportunityId,
    latestScore: row.score,
    latestScreenedAt: row.screenedAt.toISOString(),
    stage: row.stage,
    companyName: row.companyName,
    themeName: themeByCompany.get(row.companyName) ?? null,
  }));
}

export const loadDashboardRouteData = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAuthenticated();
    const [pipeline, themesData, topDeals] = await Promise.all([
      getPipelineData(),
      getThemesData(),
      getTopDealsData(10),
    ]);
    return { pipeline, themesData, topDeals };
  },
);
