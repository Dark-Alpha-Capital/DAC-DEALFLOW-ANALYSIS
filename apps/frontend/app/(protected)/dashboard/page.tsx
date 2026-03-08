import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { GlobalDashboard } from "@/components/dashboard/GlobalDashboard";
import db, {
  aiScreenings,
  companies,
  dealOpportunities,
  desc,
  eq,
  leads,
  themes,
} from "@repo/db";
import { isNotNull, isNull } from "@repo/db";

export const metadata: Metadata = {
  title: "Global Dashboard",
  description: "Pipeline, themes, and top deals in one command view.",
};

export default function DashboardPage() {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Global Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pipeline, lead flow, theme coverage, and top-ranked deals by latest
            screening score.
          </p>
        </div>
      </div>
      <AuthedDashboard sessionPromise={sessionPromise} />
    </section>
  );
}

async function AuthedDashboard(props: {
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const userSession = await props.sessionPromise;
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  const [pipeline, themesData, topDeals] = await Promise.all([
    getPipelineData(),
    getThemesData(),
    getTopDealsData(10),
  ]);

  return (
    <GlobalDashboard
      pipeline={pipeline}
      themes={themesData}
      topDeals={topDeals}
    />
  );
}

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
  const rows = await db
    .select({
      dealOpportunityId: aiScreenings.dealOpportunityId,
      score: aiScreenings.score,
      screenedAt: aiScreenings.createdAt,
      stage: dealOpportunities.stage,
      companyName: companies.name,
      companyDeletedAt: companies.deletedAt,
      themeName: themes.name,
      themeDeletedAt: themes.deletedAt,
    })
    .from(aiScreenings)
    .leftJoin(
      dealOpportunities,
      eq(aiScreenings.dealOpportunityId, dealOpportunities.id),
    )
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .leftJoin(themes, eq(companies.themeId, themes.id))
    .where(isNotNull(aiScreenings.score))
    .orderBy(desc(aiScreenings.createdAt), desc(aiScreenings.id));

  const latestByDeal = new Map<
    string,
    {
      dealOpportunityId: string;
      latestScore: number;
      latestScreenedAt: string;
      stage: string;
      companyName: string;
      themeName: string | null;
    }
  >();

  for (const row of rows) {
    if (!row.dealOpportunityId || row.score == null || !row.screenedAt)
      continue;
    if (!row.companyName || row.companyDeletedAt != null || row.stage == null)
      continue;
    if (latestByDeal.has(row.dealOpportunityId)) continue;

    latestByDeal.set(row.dealOpportunityId, {
      dealOpportunityId: row.dealOpportunityId,
      latestScore: row.score,
      latestScreenedAt: row.screenedAt.toISOString(),
      stage: row.stage,
      companyName: row.companyName,
      themeName: row.themeDeletedAt ? null : row.themeName,
    });
  }

  return Array.from(latestByDeal.values())
    .sort(
      (a, b) =>
        b.latestScore - a.latestScore ||
        new Date(b.latestScreenedAt).getTime() -
          new Date(a.latestScreenedAt).getTime(),
    )
    .slice(0, limit);
}
