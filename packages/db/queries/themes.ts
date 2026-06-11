import {
  themes,
  companies,
  dealOpportunities,
  industryIntelligence,
  themePerformance,
  theses,
  themeCompanyCoverage,
  aiScreenings,
} from "../schema";
import { db } from "../index";
import {
  eq,
  and,
  or,
  desc,
  count,
  gte,
  lte,
  isNull,
} from "drizzle-orm";
import { ilike } from "../sqlite-helpers";

/**
 * Get a theme by id
 */
export const GetThemeById = async (id: string) => {
  try {
    const [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, id), isNull(themes.deletedAt)));
    return theme ?? null;
  } catch (error) {
    console.error("Error fetching theme by id", error);
    throw error;
  }
};

interface GetThemesResult {
  data: (typeof themes.$inferSelect)[];
  totalCount: number;
  totalPages: number;
}

type ThemeStatus = "ACTIVE" | "PAUSED" | "RETIRED";

/**
 * Get all themes with pagination and filters
 */
export const GetAllThemes = async ({
  offset = 0,
  limit = 50,
  search = "",
  sector = "",
  status,
  minCapitalPriorityScore,
  maxCapitalPriorityScore,
  minConfidenceScore,
  maxConfidenceScore,
}: {
  offset?: number;
  limit?: number;
  search?: string;
  sector?: string;
  status?: ThemeStatus;
  minCapitalPriorityScore?: number;
  maxCapitalPriorityScore?: number;
  minConfidenceScore?: number;
  maxConfidenceScore?: number;
}): Promise<GetThemesResult> => {
  try {
    const conditions = [isNull(themes.deletedAt)];

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(themes.name, term),
          ilike(themes.description, term),
          ilike(themes.sector, term),
        )!,
      );
    }
    if (sector.trim()) {
      conditions.push(ilike(themes.sector, `%${sector.trim()}%`));
    }
    if (status) {
      conditions.push(eq(themes.status, status));
    }
    if (
      minCapitalPriorityScore != null &&
      Number.isFinite(minCapitalPriorityScore)
    ) {
      conditions.push(
        gte(themes.capitalPriorityScore, minCapitalPriorityScore),
      );
    }
    if (
      maxCapitalPriorityScore != null &&
      Number.isFinite(maxCapitalPriorityScore)
    ) {
      conditions.push(
        lte(themes.capitalPriorityScore, maxCapitalPriorityScore),
      );
    }
    if (minConfidenceScore != null && Number.isFinite(minConfidenceScore)) {
      conditions.push(gte(themes.confidenceScore, minConfidenceScore));
    }
    if (maxConfidenceScore != null && Number.isFinite(maxConfidenceScore)) {
      conditions.push(lte(themes.confidenceScore, maxConfidenceScore));
    }

    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(themes)
        .where(whereClause)
        .orderBy(desc(themes.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(themes).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from Theme", error);
    throw error;
  }
};

/**
 * Get a theme with industry intelligence, performance, and aggregate counts
 */
export const GetThemeWithAnalytics = async (id: string) => {
  try {
    const [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, id), isNull(themes.deletedAt)));
    if (!theme) {
      return null;
    }

    const [
      latestIntelligence,
      latestPerformance,
      companyCountResult,
      dealOppCountResult,
    ] = await Promise.all([
      db
        .select()
        .from(industryIntelligence)
        .where(
          and(
            eq(industryIntelligence.themeId, id),
            eq(industryIntelligence.isActive, true),
          ),
        )
        .orderBy(desc(industryIntelligence.createdAt))
        .limit(1),
      db
        .select()
        .from(themePerformance)
        .where(eq(themePerformance.themeId, id))
        .orderBy(
          desc(themePerformance.observedAt),
          desc(themePerformance.createdAt),
        )
        .limit(1),
      db
        .select({ count: count() })
        .from(companies)
        .where(and(eq(companies.themeId, id), isNull(companies.deletedAt))),
      db
        .select({ count: count() })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(and(eq(companies.themeId, id), isNull(companies.deletedAt))),
    ]);

    const companyCount = companyCountResult[0]?.count ?? 0;
    const dealOpportunityCount = dealOppCountResult[0]?.count ?? 0;

    return {
      theme,
      industryIntelligence: latestIntelligence[0] ?? null,
      performance: latestPerformance[0] ?? null,
      companyCount,
      dealOpportunityCount,
    };
  } catch (error) {
    console.error("Error fetching theme with analytics", error);
    throw error;
  }
};

/**
 * Get deal opportunities for companies within a specific theme
 */
export const GetDealOpportunitiesByThemeId = async (themeId: string) => {
  try {
    const rows = await db
      .select({
        opp: dealOpportunities,
        company: companies,
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .leftJoin(
        themes,
        and(eq(companies.themeId, themes.id), isNull(themes.deletedAt)),
      )
      .where(
        and(
          eq(companies.themeId, themeId),
          isNull(companies.deletedAt),
          isNull(themes.deletedAt),
        ),
      )
      .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id));

    return rows;
  } catch (error) {
    console.error("Failed query: select deal opportunities by themeId", error);
    throw error;
  }
};

export interface ScreenedDealOpportunity {
  opportunity: typeof dealOpportunities.$inferSelect;
  company: {
    name: string;
    industry: string | null;
    location: string | null;
  } | null;
  screenings: (typeof aiScreenings.$inferSelect)[];
}

/**
 * Get all deal opportunities that have AI screenings attached
 */
export const GetDealOpportunitiesWithScreenings = async (): Promise<
  ScreenedDealOpportunity[]
> => {
  try {
    const rows = await db
      .select({
        opp: dealOpportunities,
        companyName: companies.name,
        companyIndustry: companies.industry,
        companyLocation: companies.location,
        screening: aiScreenings,
      })
      .from(dealOpportunities)
      .innerJoin(
        aiScreenings,
        eq(aiScreenings.dealOpportunityId, dealOpportunities.id),
      )
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(isNull(companies.deletedAt))
      .orderBy(
        desc(dealOpportunities.createdAt),
        desc(dealOpportunities.id),
        desc(aiScreenings.createdAt),
      );

    const byOpp = new Map<string, ScreenedDealOpportunity>();

    for (const row of rows) {
      const existing = byOpp.get(row.opp.id);
      const company = row.companyName
        ? {
          name: row.companyName,
          industry: row.companyIndustry,
          location: row.companyLocation,
        }
        : null;

      if (!existing) {
        byOpp.set(row.opp.id, {
          opportunity: row.opp,
          company,
          screenings: row.screening ? [row.screening] : [],
        });
      } else if (row.screening) {
        existing.screenings.push(row.screening);
      }
    }

    return Array.from(byOpp.values());
  } catch (error) {
    console.error(
      "Failed query: select deal opportunities with screenings",
      error,
    );
    throw error;
  }
};

export const GetThemeWorkspaceById = async (id: string) => {
  try {
    const [theme] = await db
      .select()
      .from(themes)
      .where(and(eq(themes.id, id), isNull(themes.deletedAt)));

    if (!theme) {
      return null;
    }

    const [
      thesisHistory,
      intelligenceHistory,
      performanceHistory,
      companyCountResult,
      dealOppCountResult,
      coverageRows,
    ] = await Promise.all([
      db
        .select()
        .from(theses)
        .where(eq(theses.themeId, id))
        .orderBy(desc(theses.createdAt)),
      db
        .select()
        .from(industryIntelligence)
        .where(eq(industryIntelligence.themeId, id))
        .orderBy(desc(industryIntelligence.createdAt)),
      db
        .select()
        .from(themePerformance)
        .where(eq(themePerformance.themeId, id))
        .orderBy(
          desc(themePerformance.observedAt),
          desc(themePerformance.createdAt),
        ),
      db
        .select({ count: count() })
        .from(companies)
        .where(and(eq(companies.themeId, id), isNull(companies.deletedAt))),
      db
        .select({ count: count() })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(and(eq(companies.themeId, id), isNull(companies.deletedAt))),
      db
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
            eq(themeCompanyCoverage.themeId, id),
            isNull(companies.deletedAt),
          ),
        )
        .orderBy(desc(themeCompanyCoverage.updatedAt)),
    ]);

    const activeThesis = thesisHistory.find((item) => item.isActive) ?? null;
    const activeIndustryIntelligence =
      intelligenceHistory.find((item) => item.isActive) ?? null;
    const latestPerformance = performanceHistory[0] ?? null;
    const companyCount = companyCountResult[0]?.count ?? 0;
    const dealOpportunityCount = dealOppCountResult[0]?.count ?? 0;

    return {
      theme,
      activeThesis,
      thesisHistory,
      activeIndustryIntelligence,
      industryIntelligenceHistory: intelligenceHistory,
      latestPerformance,
      performanceHistory,
      companyCount,
      dealOpportunityCount,
      coverage: coverageRows,
    };
  } catch (error) {
    console.error("Error fetching theme workspace by id", error);
    throw error;
  }
};

