import {
  dealOpportunities,
  companies,
  dealOpportunityScreenings,
  dealFinancialSnapshots,
  dealRiskFlags,
} from "../schema";
import { db } from "../index";
import {
  eq,
  and,
  desc,
  asc,
  count,
  or,
  ilike,
  isNull,
  sql,
} from "drizzle-orm";

/**
 * Get DealOpportunity by id
 */
export const GetDealOpportunityById = async (id: string) => {
  const [opp] = await db
    .select()
    .from(dealOpportunities)
    .where(eq(dealOpportunities.id, id));
  return opp ?? null;
};

/**
 * Get DealOpportunity by legacy Deal id (for post-migration resolution)
 */
export const GetDealOpportunityByLegacyDealId = async (
  legacyDealId: string,
) => {
  const [opp] = await db
    .select()
    .from(dealOpportunities)
    .where(eq(dealOpportunities.legacyDealId, legacyDealId));
  return opp ?? null;
};

export const GetLatestDealFinancialSnapshotByDealOpportunityId = async (
  dealOpportunityId: string,
) => {
  const [snapshot] = await db
    .select()
    .from(dealFinancialSnapshots)
    .where(eq(dealFinancialSnapshots.dealOpportunityId, dealOpportunityId))
    .orderBy(
      desc(dealFinancialSnapshots.createdAt),
      desc(dealFinancialSnapshots.id),
    )
    .limit(1);
  return snapshot ?? null;
};

export const GetDealFinancialSnapshotsByDealOpportunityId = async (
  dealOpportunityId: string,
) => {
  return db
    .select()
    .from(dealFinancialSnapshots)
    .where(eq(dealFinancialSnapshots.dealOpportunityId, dealOpportunityId))
    .orderBy(
      desc(dealFinancialSnapshots.createdAt),
      desc(dealFinancialSnapshots.id),
    );
};

export const GetDealRiskFlagsByDealOpportunityId = async (
  dealOpportunityId: string,
) => {
  return db
    .select()
    .from(dealRiskFlags)
    .where(eq(dealRiskFlags.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(dealRiskFlags.createdAt), desc(dealRiskFlags.id));
};

/**
 * Get DealOpportunities linked to a lead, with company joined for display.
 */
export const GetDealOpportunitiesByLeadId = async (leadId: string) => {
  const rows = await db
    .select({
      opp: {
        id: dealOpportunities.id,
        stage: dealOpportunities.stage,
        status: dealOpportunities.status,
        dealTeaser: dealOpportunities.dealTeaser,
        brokerage: dealOpportunities.brokerage,
        sourceWebsite: dealOpportunities.sourceWebsite,
        dealType: dealOpportunities.dealType,
        createdAt: dealOpportunities.createdAt,
        revenue: dealOpportunities.revenue,
        ebitda: dealOpportunities.ebitda,
        askingPrice: dealOpportunities.askingPrice,
      },
      company: {
        name: companies.name,
        industry: companies.industry,
        location: companies.location,
      },
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(
      and(eq(dealOpportunities.leadId, leadId), isNull(companies.deletedAt)),
    )
    .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id));
  return rows.map(({ opp, company }) => ({
    ...opp,
    company:
      company && company.name
        ? {
          name: company.name,
          industry: company.industry,
          location: company.location,
        }
        : null,
  }));
};

export type DealOpportunityWithCompany = Awaited<
  ReturnType<typeof GetDealOpportunitiesByLeadId>
>[number];

interface GetDealOpportunitiesResult {
  data: Array<{
    opp: typeof dealOpportunities.$inferSelect;
    company: {
      name: string;
      industry: string | null;
      location: string | null;
    } | null;
  }>;
  totalCount: number;
  totalPages: number;
}

export interface RankedDealOpportunityRow {
  opp: typeof dealOpportunities.$inferSelect;
  company: {
    id: string | null;
    name: string | null;
    industry: string | null;
    location: string | null;
  } | null;
  screening: typeof dealOpportunityScreenings.$inferSelect | null;
}

/**
 * Get all deal opportunities with company, paginated
 */
export const GetAllDealOpportunities = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetDealOpportunitiesResult> => {
  try {
    const baseQuery = db
      .select({
        opp: dealOpportunities,
        company: {
          name: companies.name,
          industry: companies.industry,
          location: companies.location,
        },
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(isNull(companies.deletedAt))
      .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id));

    const [data, countResult] = await Promise.all([
      baseQuery.limit(limit).offset(offset),
      db
        .select({ count: count() })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(isNull(companies.deletedAt)),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from DealOpportunity", error);
    throw error;
  }
};

/**
 * Get all deal opportunities with company, ordered by pipeline stage
 */
export const GetDealOpportunitiesByStages = async () => {
  try {
    const data: GetDealOpportunitiesResult["data"] = await db
      .select({
        opp: dealOpportunities,
        company: {
          name: companies.name,
          industry: companies.industry,
          location: companies.location,
        },
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(isNull(companies.deletedAt))
      .orderBy(
        dealOpportunities.stage,
        desc(dealOpportunities.createdAt),
        desc(dealOpportunities.id),
      );

    return data;
  } catch (error) {
    console.error("Failed query: select from DealOpportunity by stages", error);
    throw error;
  }
};

const rankedDealOpportunitiesOrderBy = [
  sql`case
    when ${dealOpportunityScreenings.status} = 'PASS' then 0
    when ${dealOpportunityScreenings.status} = 'INCOMPLETE' then 1
    when ${dealOpportunityScreenings.status} = 'FAIL' then 2
    else 3
  end`,
  desc(dealOpportunityScreenings.score),
  desc(dealOpportunityScreenings.screenedAt),
  desc(dealOpportunities.createdAt),
  desc(dealOpportunities.id),
] as const;

function escapeIlikePattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export const GetRankedDealOpportunities = async (): Promise<
  RankedDealOpportunityRow[]
> => {
  try {
    return await db
      .select({
        opp: dealOpportunities,
        company: {
          id: companies.id,
          name: companies.name,
          industry: companies.industry,
          location: companies.location,
        },
        screening: dealOpportunityScreenings,
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .leftJoin(
        dealOpportunityScreenings,
        eq(dealOpportunityScreenings.dealOpportunityId, dealOpportunities.id),
      )
      .where(isNull(companies.deletedAt))
      .orderBy(...rankedDealOpportunitiesOrderBy);
  } catch (error) {
    console.error("Failed query: ranked deal opportunities", error);
    throw error;
  }
};

export type GetRankedDealOpportunitiesPaginatedResult = {
  data: RankedDealOpportunityRow[];
  totalCount: number;
  totalPages: number;
};

/** Ranked deal opportunities with optional text search (company name, teaser, description). */
export const GetRankedDealOpportunitiesPaginated = async ({
  offset = 0,
  limit = 25,
  query = "",
}: {
  offset?: number;
  limit?: number;
  query?: string;
}): Promise<GetRankedDealOpportunitiesPaginatedResult> => {
  const trimmed = query.trim().slice(0, 500);
  const searchFilter =
    trimmed.length > 0
      ? or(
        ilike(
          companies.name,
          `%${escapeIlikePattern(trimmed)}%`,
        ),
        ilike(
          dealOpportunities.dealTeaser,
          `%${escapeIlikePattern(trimmed)}%`,
        ),
        ilike(
          dealOpportunities.description,
          `%${escapeIlikePattern(trimmed)}%`,
        ),
      )
      : undefined;

  const baseWhere = isNull(companies.deletedAt);
  const whereClause =
    searchFilter != null ? and(baseWhere, searchFilter) : baseWhere;

  try {
    const baseFrom = () =>
      db
        .select({
          opp: dealOpportunities,
          company: {
            id: companies.id,
            name: companies.name,
            industry: companies.industry,
            location: companies.location,
          },
          screening: dealOpportunityScreenings,
        })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .leftJoin(
          dealOpportunityScreenings,
          eq(
            dealOpportunityScreenings.dealOpportunityId,
            dealOpportunities.id,
          ),
        )
        .where(whereClause);

    const [rows, countResult] = await Promise.all([
      baseFrom()
        .orderBy(...rankedDealOpportunitiesOrderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .leftJoin(
          dealOpportunityScreenings,
          eq(
            dealOpportunityScreenings.dealOpportunityId,
            dealOpportunities.id,
          ),
        )
        .where(whereClause),
    ]);

    const totalCount = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return { data: rows, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: ranked deal opportunities (paginated)", error);
    throw error;
  }
};

export type TopRankedDeal = {
  dealOpportunityId: string;
  companyName: string;
  stage: string;
  score: number;
  screenedAt: Date;
};

export const GetTopRankedDeals = async (
  limit = 10,
): Promise<TopRankedDeal[]> => {
  try {
    const rows = await db
      .select({
        dealOpportunityId: dealOpportunities.id,
        companyName: companies.name,
        stage: dealOpportunities.stage,
        score: dealOpportunityScreenings.score,
        screenedAt: dealOpportunityScreenings.screenedAt,
      })
      .from(dealOpportunityScreenings)
      .innerJoin(
        dealOpportunities,
        eq(dealOpportunityScreenings.dealOpportunityId, dealOpportunities.id),
      )
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(
        and(
          eq(dealOpportunityScreenings.status, "PASS"),
          isNull(companies.deletedAt),
        ),
      )
      .orderBy(
        desc(dealOpportunityScreenings.score),
        desc(dealOpportunityScreenings.screenedAt),
      )
      .limit(limit);

    return rows
      .filter(
        (
          row,
        ): row is typeof row & {
          companyName: string;
          score: number;
          screenedAt: Date;
          stage: string;
        } =>
          row.companyName != null &&
          row.score != null &&
          row.screenedAt != null &&
          row.stage != null,
      )
      .map((row) => ({
        dealOpportunityId: row.dealOpportunityId,
        companyName: row.companyName,
        stage: row.stage,
        score: row.score,
        screenedAt: row.screenedAt,
      }));
  } catch (error) {
    console.error("Failed query: top ranked deals", error);
    throw error;
  }
};

/**
 * Get deal opportunities for a single company
 */
export const GetDealOpportunitiesByCompanyId = async (companyId: string) => {
  try {
    const data = await db
      .select()
      .from(dealOpportunities)
      .where(eq(dealOpportunities.companyId, companyId))
      .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id));

    return data;
  } catch (error) {
    console.error(
      "Failed query: select from DealOpportunity by companyId",
      error,
    );
    throw error;
  }
};

