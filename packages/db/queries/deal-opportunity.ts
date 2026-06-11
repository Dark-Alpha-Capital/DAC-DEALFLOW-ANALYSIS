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
  count,
  or,
  isNull,
  not,
  sql,
  type SQL,
} from "drizzle-orm";
import { ilike } from "../sqlite-helpers";

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

/** Columns loaded for deal opportunities list / kanban (no `Company` join). */
export type DealOpportunityListOpp = Pick<
  typeof dealOpportunities.$inferSelect,
  | "id"
  | "companyId"
  | "title"
  | "dealTeaser"
  | "description"
  | "companyLocation"
  | "brokerage"
  | "stage"
  | "status"
  | "revenue"
  | "ebitda"
  | "askingPrice"
  | "dealType"
  | "reviewState"
  | "createdAt"
  | "updatedAt"
  | "bitrixId"
  | "bitrixLink"
>;

export interface RankedDealOpportunityRow {
  opp: DealOpportunityListOpp;
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

const dealOpportunityListOpp = {
  id: dealOpportunities.id,
  companyId: dealOpportunities.companyId,
  title: dealOpportunities.title,
  dealTeaser: dealOpportunities.dealTeaser,
  description: dealOpportunities.description,
  companyLocation: dealOpportunities.companyLocation,
  brokerage: dealOpportunities.brokerage,
  stage: dealOpportunities.stage,
  status: dealOpportunities.status,
  revenue: dealOpportunities.revenue,
  ebitda: dealOpportunities.ebitda,
  askingPrice: dealOpportunities.askingPrice,
  dealType: dealOpportunities.dealType,
  reviewState: dealOpportunities.reviewState,
  createdAt: dealOpportunities.createdAt,
  updatedAt: dealOpportunities.updatedAt,
  bitrixId: dealOpportunities.bitrixId,
  bitrixLink: dealOpportunities.bitrixLink,
} as const;

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
        opp: dealOpportunityListOpp,
        screening: dealOpportunityScreenings,
      })
      .from(dealOpportunities)
      .leftJoin(
        dealOpportunityScreenings,
        eq(dealOpportunityScreenings.dealOpportunityId, dealOpportunities.id),
      )
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

/** Ranked deal opportunities with optional text search on listing fields (no `Company` join). */
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
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const searchFilter =
    trimmed.length > 0
      ? or(
        ilike(dealOpportunities.title, pattern),
        ilike(dealOpportunities.dealTeaser, pattern),
        ilike(dealOpportunities.description, pattern),
        ilike(dealOpportunities.companyLocation, pattern),
        ilike(dealOpportunities.brokerage, pattern),
      )
      : undefined;

  const whereClause = searchFilter ?? sql`true`;

  try {
    const baseFrom = () =>
      db
        .select({
          opp: dealOpportunityListOpp,
          screening: dealOpportunityScreenings,
        })
        .from(dealOpportunities)
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

/**
 * Aligns with Bitrix `normalizeBitrixStageIdForPipeline` (see `@repo/bitrix-sync`) so DB
 * queries bucket the same way as the Kanban UI.
 */
export function normalizeStoredDealStageForPipeline(
  stageId: string,
  pipelineCategoryId: string,
): string {
  const t = stageId.trim();
  const cat = String(pipelineCategoryId ?? "").trim();
  if (!t || !cat) return t;
  const m = /^C(\d+):(.+)$/i.exec(t);
  const rest = m?.[2]?.trim();
  const prefixCat = m?.[1];
  if (prefixCat != null && rest && prefixCat === cat) {
    return rest;
  }
  return t;
}

function rankedDealTextSearchFilter(query: string): SQL | undefined {
  const trimmed = query.trim().slice(0, 500);
  if (trimmed.length === 0) return undefined;
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  return or(
    ilike(dealOpportunities.title, pattern),
    ilike(dealOpportunities.dealTeaser, pattern),
    ilike(dealOpportunities.description, pattern),
    ilike(dealOpportunities.companyLocation, pattern),
    ilike(dealOpportunities.brokerage, pattern),
  );
}

function dealStageMatchesCanonical(
  canonicalStageId: string,
  pipelineCategoryId: string,
): SQL {
  const c = canonicalStageId.trim();
  const cat = pipelineCategoryId.trim();
  const prefixed = `C${cat}:${c}`;
  return or(
    eq(dealOpportunities.stage, c),
    eq(dealOpportunities.stage, prefixed),
  )!;
}

function kanbanColumnStageWhere(args: {
  columnStageId: string;
  fallbackStageId: string;
  allPipelineStageIds: readonly string[];
  pipelineCategoryId: string;
}): SQL {
  const {
    columnStageId,
    fallbackStageId,
    allPipelineStageIds,
    pipelineCategoryId,
  } = args;
  const col = columnStageId.trim();
  const fb = fallbackStageId.trim();
  const cat = pipelineCategoryId.trim();

  if (col !== fb) {
    return dealStageMatchesCanonical(col, cat);
  }

  const others = allPipelineStageIds
    .map((s) => s.trim())
    .filter((s) => s !== fb);
  if (others.length === 0) {
    return sql`true`;
  }

  const matchOthers = or(
    ...others.map((s) => dealStageMatchesCanonical(s, cat)),
  )!;
  return or(dealStageMatchesCanonical(fb, cat), not(matchOthers))!;
}

export type GetRankedDealOpportunityKanbanSummaryResult = {
  totalCount: number;
  countsByStage: Record<string, number>;
};

/**
 * One lightweight pass for total matches + per-column counts (same search as ranked list).
 */
export const GetRankedDealOpportunityKanbanSummary = async ({
  query = "",
  pipelineCategoryId = "0",
  pipelineStageIds,
  fallbackStageId,
}: {
  query?: string;
  pipelineCategoryId?: string;
  pipelineStageIds: readonly string[];
  fallbackStageId: string;
}): Promise<GetRankedDealOpportunityKanbanSummaryResult> => {
  const search = rankedDealTextSearchFilter(query);
  const whereClause = search ?? sql`true`;
  const idSet = new Set(pipelineStageIds.map((s) => s.trim()));
  const fb = fallbackStageId.trim();
  const cat = pipelineCategoryId.trim();

  try {
    const rows = await db
      .select({ stage: dealOpportunities.stage })
      .from(dealOpportunities)
      .where(whereClause);

    const countsByStage: Record<string, number> = Object.fromEntries(
      pipelineStageIds.map((id) => [id.trim(), 0]),
    );

    for (const r of rows) {
      const raw = r.stage?.trim() || fb;
      const norm = normalizeStoredDealStageForPipeline(raw, cat);
      const bucket = idSet.has(norm) ? norm : fb;
      countsByStage[bucket] = (countsByStage[bucket] ?? 0) + 1;
    }

    return { totalCount: rows.length, countsByStage };
  } catch (error) {
    console.error("Failed query: kanban deal opportunity summary", error);
    throw error;
  }
};

export const GetRankedDealOpportunitiesForKanbanColumnPaginated = async ({
  columnStageId,
  fallbackStageId,
  allPipelineStageIds,
  query = "",
  offset = 0,
  limit = 40,
  pipelineCategoryId = "0",
}: {
  columnStageId: string;
  fallbackStageId: string;
  allPipelineStageIds: readonly string[];
  query?: string;
  offset?: number;
  limit?: number;
  pipelineCategoryId?: string;
}): Promise<RankedDealOpportunityRow[]> => {
  const search = rankedDealTextSearchFilter(query);
  const stageSql = kanbanColumnStageWhere({
    columnStageId,
    fallbackStageId,
    allPipelineStageIds,
    pipelineCategoryId,
  });
  const whereClause = search ? and(search, stageSql) : stageSql;

  try {
    return await db
      .select({
        opp: dealOpportunityListOpp,
        screening: dealOpportunityScreenings,
      })
      .from(dealOpportunities)
      .leftJoin(
        dealOpportunityScreenings,
        eq(
          dealOpportunityScreenings.dealOpportunityId,
          dealOpportunities.id,
        ),
      )
      .where(whereClause)
      .orderBy(...rankedDealOpportunitiesOrderBy)
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error(
      "Failed query: ranked deal opportunities (kanban column paginated)",
      error,
    );
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

