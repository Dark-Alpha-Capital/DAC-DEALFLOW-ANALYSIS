import { db } from "../index";
import {
  themes,
  theses,
  industryIntelligence,
  themePerformance,
  themeCompanyCoverage,
  companies,
} from "../schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

export async function listThemesForSelect() {
  return db
    .select({
      id: themes.id,
      name: themes.name,
      status: themes.status,
    })
    .from(themes)
    .where(isNull(themes.deletedAt))
    .orderBy(asc(themes.name));
}

export async function getActiveThesisForTheme(themeId: string) {
  const [active] = await db
    .select()
    .from(theses)
    .where(and(eq(theses.themeId, themeId), eq(theses.isActive, true)))
    .orderBy(desc(theses.createdAt))
    .limit(1);
  return active ?? null;
}

export async function listThesisVersionsForTheme(themeId: string) {
  return db
    .select()
    .from(theses)
    .where(eq(theses.themeId, themeId))
    .orderBy(desc(theses.createdAt));
}

export async function getActiveIndustryIntelligenceForTheme(themeId: string) {
  const [active] = await db
    .select()
    .from(industryIntelligence)
    .where(
      and(
        eq(industryIntelligence.themeId, themeId),
        eq(industryIntelligence.isActive, true),
      ),
    )
    .orderBy(desc(industryIntelligence.createdAt))
    .limit(1);
  return active ?? null;
}

export async function listIndustryIntelligenceVersionsForTheme(themeId: string) {
  return db
    .select()
    .from(industryIntelligence)
    .where(eq(industryIntelligence.themeId, themeId))
    .orderBy(desc(industryIntelligence.createdAt));
}

export async function listThemePerformanceSnapshots(themeId: string) {
  return db
    .select()
    .from(themePerformance)
    .where(eq(themePerformance.themeId, themeId))
    .orderBy(
      desc(themePerformance.observedAt),
      desc(themePerformance.createdAt),
    );
}

export async function listThemeCoverageRows(themeId: string) {
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
        eq(themeCompanyCoverage.themeId, themeId),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(desc(themeCompanyCoverage.updatedAt));
}
