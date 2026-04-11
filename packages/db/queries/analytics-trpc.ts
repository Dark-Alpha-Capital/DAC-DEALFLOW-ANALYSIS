import { db } from "../index";
import {
  aiScreenings,
  companies,
  dealOpportunities,
  dealOpportunityScreenings,
  leads,
  themes,
} from "../schema";
import { desc, eq, isNotNull, isNull } from "drizzle-orm";

export async function selectDealOpportunityThemeRowsForDealsByTheme() {
  return db
    .select({
      themeId: themes.id,
      themeName: themes.name,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .leftJoin(themes, eq(companies.themeId, themes.id))
    .where(isNull(companies.deletedAt));
}

export async function selectDealOpportunityStagesForPipeline() {
  return db
    .select({
      stage: dealOpportunities.stage,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(isNull(companies.deletedAt));
}

export async function selectLeadSourcesForAnalytics() {
  return db
    .select({
      source: leads.sourceWebsite,
    })
    .from(leads)
    .where(isNull(leads.deletedAt));
}

export async function selectDealOpportunitySourcesForAnalytics() {
  return db
    .select({
      source: dealOpportunities.sourceWebsite,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(isNull(companies.deletedAt));
}

export async function selectAiScreeningScores() {
  return db
    .select({
      score: aiScreenings.score,
    })
    .from(aiScreenings)
    .where(isNotNull(aiScreenings.score));
}

export async function selectLeadStatusesForPipelineOverview() {
  return db
    .select({
      status: leads.status,
    })
    .from(leads)
    .where(isNull(leads.deletedAt));
}

export async function selectThemesOverviewRows() {
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
  return { themeRows, companyRows, dealRows };
}

export async function selectTopDealsByLatestScreeningRows() {
  return db
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
}
