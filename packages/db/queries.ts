// Import schema first to ensure all tables are initialized
import {
  deals,
  leads,
  users,
  screeners,
  aiScreenings,
  documents,
  dealOpportunities,
  companies,
  companyNotes,
  themes,
  contacts,
  outreach,
  industryIntelligence,
  themePerformance,
  type Deal,
  type Lead,
  type Company,
  type DealType,
  type DealStatus,
} from "./schema";
// Import db after schema to ensure proper initialization order
import { db } from "./index";
import {
  eq,
  and,
  or,
  gte,
  lte,
  like,
  ilike,
  inArray,
  desc,
  asc,
  count,
  arrayOverlaps,
  sql,
} from "drizzle-orm";
import { cacheTag, cacheLife } from "next/cache";
import type { AdminUser } from "./types";

/**
 * Get a deal by id
 * @param id - the id of the deal
 * @returns the deal
 */
export const GetDealById = async (id: string) => {
  try {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal ?? null;
  } catch (error) {
    console.error("Error fetching deal by id", error);
    throw error;
  }
};

/**
 * Get a company by id
 */
export const GetCompanyById = async (id: string) => {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company ?? null;
  } catch (error) {
    console.error("Error fetching company by id", error);
    throw error;
  }
};

/**
 * Get a company with related entities for the detail page
 */
export const GetCompanyWithAllRelations = async (id: string) => {
  try {
    const [companyRow] = await db
      .select({
        company: companies,
        themeName: themes.name,
      })
      .from(companies)
      .leftJoin(themes, eq(companies.themeId, themes.id))
      .where(eq(companies.id, id));

    if (!companyRow) {
      return null;
    }

    const [companyDealOpps, companyDocuments, companyContacts, companyNotesRows] =
      await Promise.all([
        db
          .select()
          .from(dealOpportunities)
          .where(eq(dealOpportunities.companyId, id))
          .orderBy(desc(dealOpportunities.createdAt)),
        db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.entityType, "COMPANY"),
              eq(documents.entityId, id),
            ),
          ),
        db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.entityType, "COMPANY"),
              eq(contacts.entityId, id),
            ),
          ),
        db
          .select()
          .from(companyNotes)
          .where(eq(companyNotes.companyId, id))
          .orderBy(desc(companyNotes.createdAt)),
      ]);

    const dealOppIds = companyDealOpps.map((o) => o.id);
    const outreachRows = await db
      .select({
        id: outreach.id,
        dealOpportunityId: outreach.dealOpportunityId,
        companyId: outreach.companyId,
        type: outreach.type,
        notes: outreach.notes,
        outcome: outreach.outcome,
        createdById: outreach.createdById,
        createdAt: outreach.createdAt,
        createdByName: users.name,
      })
      .from(outreach)
      .leftJoin(users, eq(outreach.createdById, users.id))
      .where(
        dealOppIds.length > 0
          ? or(
            eq(outreach.companyId, id),
            inArray(outreach.dealOpportunityId, dealOppIds),
          )
          : eq(outreach.companyId, id),
      )
      .orderBy(desc(outreach.createdAt));

    return {
      company: {
        ...companyRow.company,
        themeName: companyRow.themeName,
      },
      dealOpportunities: companyDealOpps,
      documents: companyDocuments,
      contacts: companyContacts,
      outreach: outreachRows,
      notes: companyNotesRows,
    };
  } catch (error) {
    console.error("Error fetching company with relations", error);
    throw error;
  }
};

/**
 * Get a lead by id
 */
export const GetLeadById = async (id: string) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead ?? null;
  } catch (error) {
    console.error("Error fetching lead by id", error);
    throw error;
  }
};

/**
 * Get company created from a lead (if any). Used to check if lead is already converted.
 */
export const GetCompanyByFirstSeenFromLeadId = async (leadId: string) => {
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.firstSeenFromLeadId, leadId));
  return row ?? null;
};

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
export const GetDealOpportunityByLegacyDealId = async (legacyDealId: string) => {
  const [opp] = await db
    .select()
    .from(dealOpportunities)
    .where(eq(dealOpportunities.legacyDealId, legacyDealId));
  return opp ?? null;
};

/**
 * Get DealOpportunities linked to a lead, with company joined for display.
 */
export const GetDealOpportunitiesByLeadId = async (leadId: string) => {
  const rows = await db
    .select({
      opp: dealOpportunities,
      company: companies,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(eq(dealOpportunities.leadId, leadId))
    .orderBy(desc(dealOpportunities.createdAt));
  return rows.map(({ opp, company }) => ({ ...opp, company: company ?? null }));
};

export type DealOpportunityWithCompany = Awaited<
  ReturnType<typeof GetDealOpportunitiesByLeadId>
>[number];

/**
 * Get deal data for detail page - resolves uid (opp.id, legacyDealId, or legacy deal id) to DealOpportunity + Company.
 * Returns unified deal view for UI compatibility.
 */
export const GetDealWithAllRelations = async (uid: string) => {
  let opp = await GetDealOpportunityById(uid);
  if (!opp) {
    opp = await GetDealOpportunityByLegacyDealId(uid);
  }
  if (!opp) {
    const deal = await GetDealById(uid);
    if (!deal) return null;
    return {
      deal: deal as Deal & { id: string },
      documents: [] as Awaited<ReturnType<typeof getDealDocuments>>,
      aiScreenings: [] as Awaited<ReturnType<typeof getAllDealReasoningsWithScreenerName>>,
    };
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, opp.companyId));

  const [
    dealDocs,
    companyDocs,
    screenings,
    dealOpportunitiesList,
    companyContacts,
    dealContacts,
    outreachRows,
    companyNotesRows,
  ] = await Promise.all([
    getDealDocuments(opp.id),
    db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.entityType, "COMPANY"),
          eq(documents.entityId, opp.companyId),
        ),
      ),
    getAllDealReasoningsWithScreenerNameByOpportunityId(opp.id),
    db
      .select()
      .from(dealOpportunities)
      .where(eq(dealOpportunities.companyId, opp.companyId))
      .orderBy(desc(dealOpportunities.createdAt)),
    db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.entityType, "COMPANY"),
          eq(contacts.entityId, opp.companyId),
        ),
      ),
    db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.entityType, "DEAL_OPPORTUNITY"),
          eq(contacts.entityId, opp.id),
        ),
      ),
    db
      .select({
        id: outreach.id,
        dealOpportunityId: outreach.dealOpportunityId,
        companyId: outreach.companyId,
        type: outreach.type,
        notes: outreach.notes,
        outcome: outreach.outcome,
        createdById: outreach.createdById,
        createdAt: outreach.createdAt,
        createdByName: users.name,
      })
      .from(outreach)
      .leftJoin(users, eq(outreach.createdById, users.id))
      .where(
        or(
          eq(outreach.companyId, opp.companyId),
          eq(outreach.dealOpportunityId, opp.id),
        ),
      )
      .orderBy(desc(outreach.createdAt)),
    db
      .select()
      .from(companyNotes)
      .where(eq(companyNotes.companyId, opp.companyId))
      .orderBy(desc(companyNotes.createdAt)),
  ]);

  const dealView: Deal & { id: string } = {
    id: opp.id,
    dealCaption: company?.name ?? "",
    revenue: opp.revenue ?? company?.revenueEstimate ?? 0,
    ebitda: opp.ebitda ?? company?.ebitdaEstimate ?? 0,
    ebitdaMargin: opp.ebitdaMargin ?? company?.ebitdaMarginEstimate ?? 0,
    brokerage: opp.brokerage ?? "",
    industry: company?.industry ?? "",
    companyLocation: company?.location ?? null,
    sourceWebsite: opp.sourceWebsite ?? "",
    dealType: opp.dealType,
    status: opp.status,
    askingPrice: opp.askingPrice,
    grossRevenue: company?.revenueEstimate ?? null,
    firstName: opp.brokerFirstName,
    lastName: opp.brokerLastName,
    workPhone: opp.brokerPhone,
    email: opp.brokerEmail,
    title: null,
    linkedinUrl: opp.brokerLinkedIn,
    dealTeaser: opp.dealTeaser,
    tags: opp.tags ?? [],
    isPublished: opp.isPublished,
    isReviewed: opp.isReviewed,
    seen: opp.seen,
    bitrixId: opp.bitrixId,
    bitrixLink: opp.bitrixLink,
    bitrixCreatedAt: opp.bitrixCreatedAt,
    userId: opp.userId,
    createdAt: opp.createdAt,
    updatedAt: opp.updatedAt,
    description: opp.description,
    chunk_text: null,
  };

  return {
    deal: dealView,
    documents: dealDocs ?? [],
    aiScreenings: screenings ?? [],
    company: company ?? null,
    dealOpportunities: dealOpportunitiesList ?? [],
    companyContacts: companyContacts ?? [],
    dealContacts: dealContacts ?? [],
    outreach: outreachRows ?? [],
    companyDocuments: companyDocs ?? [],
    dealDocuments: dealDocs ?? [],
    companyNotes: companyNotesRows ?? [],
  };
};

async function getDealDocuments(dealOpportunityId: string) {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "DEAL_OPPORTUNITY"),
        eq(documents.entityId, dealOpportunityId)
      )
    );
}

interface GetDealsResult {
  data: Deal[];
  totalCount: number;
  totalPages: number;
}

/**
 *
 * get all deals with pagination and filter by deal type
 *
 * @param search - search query
 * @param offset - offset
 * @param limit - limit
 * @param dealTypes - deal types
 * @param ebitda - ebitda
 * @param revenue - revenue
 * @param maxRevenue - max revenue
 * @param userId - user id
 * @returns
 */
export const GetAllDeals = async ({
  search,
  offset = 0,
  limit = 50,
  dealTypes,
  ebitda,
  revenue,
  userId,
  location,
  maxRevenue,
  maxEbitda,
  brokerage,
  industry,
  ebitdaMargin,
  showSeen,
  showReviewed,
  showPublished,
  status,
  tags,
  showRecent,
}: {
  search?: string | undefined;
  offset?: number;
  limit?: number;
  dealTypes?: DealType[];
  ebitda?: string;
  revenue?: string;
  userId?: string;
  location?: string;
  maxRevenue?: string;
  maxEbitda?: string;
  brokerage?: string;
  industry?: string;
  ebitdaMargin?: string;
  showSeen?: boolean;
  showReviewed?: boolean;
  showPublished?: boolean;
  status?: DealStatus;
  tags?: string[];
  showRecent?: boolean;
}): Promise<GetDealsResult> => {
  "use cache";

  cacheTag("deals");
  cacheLife("hours");

  const ebitdaValue = ebitda ? parseFloat(ebitda) : undefined;
  const revenueValue = revenue ? parseFloat(revenue) : undefined;
  const locationValue = location ? location : undefined;
  const maxRevenueValue = maxRevenue ? parseFloat(maxRevenue) : undefined;
  const maxEbitdaValue = maxEbitda ? parseFloat(maxEbitda) : undefined;
  const brokerageValue = brokerage ? brokerage : undefined;
  const industryValue = industry ? industry : undefined;
  const ebitdaMarginValue = ebitdaMargin ? parseFloat(ebitdaMargin) : undefined;

  // Build conditions array
  const conditions = [];

  if (search) {
    conditions.push(like(deals.dealCaption, `%${search}%`));
  }
  if (dealTypes && dealTypes.length > 0) {
    conditions.push(inArray(deals.dealType, dealTypes));
  }
  if (ebitdaValue !== undefined) {
    conditions.push(gte(deals.ebitda, ebitdaValue));
  }
  if (revenueValue !== undefined) {
    conditions.push(gte(deals.revenue, revenueValue));
  }
  if (maxEbitdaValue !== undefined) {
    conditions.push(lte(deals.ebitda, maxEbitdaValue));
  }
  if (maxRevenueValue !== undefined) {
    conditions.push(lte(deals.revenue, maxRevenueValue));
  }
  if (userId) {
    conditions.push(eq(deals.userId, userId));
  }
  if (locationValue !== undefined) {
    conditions.push(like(deals.companyLocation, `%${locationValue}%`));
  }
  if (brokerageValue !== undefined) {
    conditions.push(like(deals.brokerage, `%${brokerageValue}%`));
  }
  if (industryValue !== undefined) {
    conditions.push(like(deals.industry, `%${industryValue}%`));
  }
  if (ebitdaMarginValue !== undefined) {
    conditions.push(gte(deals.ebitdaMargin, ebitdaMarginValue));
  }
  if (showSeen) {
    conditions.push(eq(deals.seen, showSeen));
  }
  if (showReviewed) {
    conditions.push(eq(deals.isReviewed, showReviewed));
  }
  if (showPublished) {
    conditions.push(eq(deals.isPublished, showPublished));
  }
  if (status) {
    conditions.push(eq(deals.status, status));
  }
  if (tags && tags.length > 0) {
    conditions.push(arrayOverlaps(deals.tags, tags));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderByClause = showRecent
    ? desc(deals.createdAt)
    : asc(deals.createdAt);

  try {
    const baseDataQuery = db
      .select()
      .from(deals)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const baseCountQuery = db.select({ count: count() }).from(deals);

    const [data, countResult] = await Promise.all([
      whereClause ? baseDataQuery.where(whereClause) : baseDataQuery,
      whereClause ? baseCountQuery.where(whereClause) : baseCountQuery,
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from Deal", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
};

/**
 * Get a user by their id
 * @param id - the id of the user
 * @returns the user
 */
export const getUserById = async (id: string) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  } catch (error) {
    console.error("Error fetching user by id", error);
    throw new Error("Error fetching user by id");
  }
};

/**
 * Get all screeners
 * @returns all screeners
 */
export async function getAllScreeners() {
  try {
    return await db
      .select({
        id: screeners.id,
        name: screeners.name,
        createdAt: screeners.createdAt,
        updatedAt: screeners.updatedAt,
      })
      .from(screeners);
  } catch (error) {
    console.error("Error fetching all screeners", error);
    return null;
  }
}

/**
 * Get all screeners
 * @returns all screeners
 */
export async function getAllScreenersWithContent() {
  try {
    return await db
      .select({
        id: screeners.id,
        name: screeners.name,
      })
      .from(screeners);
  } catch (error) {
    console.error("Error fetching all screeners", error);
    return null;
  }
}

/**
 * Get all deal reasonings with screener name (by dealOpportunityId)
 */
export async function getAllDealReasoningsWithScreenerNameByOpportunityId(
  dealOpportunityId: string
) {
  try {
    const results = await db
      .select({
        id: aiScreenings.id,
        title: aiScreenings.title,
        sentiment: aiScreenings.sentiment,
        score: aiScreenings.score,
        explanation: aiScreenings.explanation,
        createdAt: aiScreenings.createdAt,
        updatedAt: aiScreenings.updatedAt,
        screener: {
          id: screeners.id,
          name: screeners.name,
        },
      })
      .from(aiScreenings)
      .leftJoin(screeners, eq(aiScreenings.screenerId, screeners.id))
      .where(eq(aiScreenings.dealOpportunityId, dealOpportunityId))
      .orderBy(desc(aiScreenings.createdAt));

    return results.map((r) => ({
      ...r,
      screener: r.screener?.id ? r.screener : null,
    }));
  } catch (error) {
    console.error(
      "Error fetching all deal reasonings with screener name",
      error
    );
    return null;
  }
}

/**
 * Get all deal reasonings - resolves legacy dealId to dealOpportunityId first
 */
export async function getAllDealReasoningsWithScreenerName(dealId: string) {
  const opp = await GetDealOpportunityByLegacyDealId(dealId);
  if (!opp) return null;
  return getAllDealReasoningsWithScreenerNameByOpportunityId(opp.id);
}

/**
 * Get a complete ai reasoning by id
 * @param reasoningId - the id of the reasoning
 * @returns the complete ai reasoning
 */
export async function getCompleteAiReasoningById(reasoningId: string) {
  try {
    const [result] = await db
      .select({
        id: aiScreenings.id,
        title: aiScreenings.title,
        sentiment: aiScreenings.sentiment,
        score: aiScreenings.score,
        content: aiScreenings.content,
        explanation: aiScreenings.explanation,
        createdAt: aiScreenings.createdAt,
        updatedAt: aiScreenings.updatedAt,
        screener: {
          id: screeners.id,
          name: screeners.name,
        },
      })
      .from(aiScreenings)
      .leftJoin(screeners, eq(aiScreenings.screenerId, screeners.id))
      .where(eq(aiScreenings.id, reasoningId));

    if (!result) return null;

    return {
      ...result,
      screener: result.screener?.id ? result.screener : null,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
}


export async function getUsersForAdminTable(): Promise<AdminUser[]> {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isBlocked: users.isBlocked,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return result.map((user) => ({
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      isBlocked: user.isBlocked,
    }));
  } catch (error) {
    console.error("Error fetching users for admin table", error);
    return [];
  }
}

export const getFirstThreeDealAIScreenings = async (dealId: string) => {
  const opp = await GetDealOpportunityByLegacyDealId(dealId);
  if (!opp) return [];
  try {
    return await db
      .select()
      .from(aiScreenings)
      .where(eq(aiScreenings.dealOpportunityId, opp.id))
      .orderBy(desc(aiScreenings.createdAt))
      .limit(3);
  } catch (error) {
    console.error("Error fetching deal ai screenings", error);
    throw error;
  }
};

interface GetLeadsResult {
  data: Lead[];
  totalCount: number;
  totalPages: number;
}

/**
 * Get all leads with pagination
 */
export const GetAllLeads = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetLeadsResult> => {
  try {
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(leads),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from Lead", error);
    throw error;
  }
};

interface GetDealOpportunitiesResult {
  data: Array<{
    opp: typeof dealOpportunities.$inferSelect;
    company: { name: string; industry: string | null; location: string | null } | null;
  }>;
  totalCount: number;
  totalPages: number;
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
      .orderBy(desc(dealOpportunities.createdAt));

    const [data, countResult] = await Promise.all([
      baseQuery.limit(limit).offset(offset),
      db.select({ count: count() }).from(dealOpportunities),
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
      .orderBy(dealOpportunities.stage, desc(dealOpportunities.createdAt));

    return data;
  } catch (error) {
    console.error("Failed query: select from DealOpportunity by stages", error);
    throw error;
  }
};

interface GetCompaniesResult {
  data: Array<Company & { themeName: string | null }>;
  totalCount: number;
  totalPages: number;
}

/**
 * Get all companies with pagination
 */
export const GetAllCompanies = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetCompaniesResult> => {
  try {
    const [rows, countResult] = await Promise.all([
      db
        .select({
          company: companies,
          themeName: themes.name,
        })
        .from(companies)
        .leftJoin(themes, eq(companies.themeId, themes.id))
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(companies),
    ]);

    const data = rows.map((row) => ({
      ...row.company,
      themeName: row.themeName,
    }));

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from Company", error);
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
      .orderBy(desc(dealOpportunities.createdAt));

    return data;
  } catch (error) {
    console.error(
      "Failed query: select from DealOpportunity by companyId",
      error,
    );
    throw error;
  }
};

/**
 * Get documents attached to a company
 */
export const GetCompanyDocuments = async (companyId: string) => {
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.entityType, "COMPANY"),
          eq(documents.entityId, companyId),
        ),
      );

    return docs;
  } catch (error) {
    console.error("Failed query: select documents for company", error);
    throw error;
  }
};

interface GetAllDocumentsResult {
  data: (typeof documents.$inferSelect)[];
  totalCount: number;
  totalPages: number;
}

/**
 * Get all documents across all entities with pagination
 */
export const GetAllDocuments = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetAllDocumentsResult> => {
  try {
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(documents)
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(documents),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select all documents", error);
    throw error;
  }
};

/**
 * Get contacts associated with a company
 */
export const GetCompanyContacts = async (companyId: string) => {
  try {
    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.entityType, "COMPANY"),
          eq(contacts.entityId, companyId),
        ),
      );

    return rows;
  } catch (error) {
    console.error("Failed query: select contacts for company", error);
    throw error;
  }
};

/**
 * Get a theme by id
 */
export const GetThemeById = async (id: string) => {
  try {
    const [theme] = await db.select().from(themes).where(eq(themes.id, id));
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

/**
 * Get all themes with pagination
 */
export const GetAllThemes = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetThemesResult> => {
  try {
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(themes)
        .orderBy(desc(themes.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(themes),
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
    const [theme] = await db.select().from(themes).where(eq(themes.id, id));
    if (!theme) {
      return null;
    }

    const [latestIntelligence, latestPerformance, companyCountResult, dealOppCountResult] =
      await Promise.all([
        db
          .select()
          .from(industryIntelligence)
          .where(eq(industryIntelligence.themeId, id))
          .orderBy(desc(industryIntelligence.createdAt))
          .limit(1),
        db
          .select()
          .from(themePerformance)
          .where(eq(themePerformance.themeId, id))
          .orderBy(desc(themePerformance.createdAt))
          .limit(1),
        db
          .select({ count: count() })
          .from(companies)
          .where(eq(companies.themeId, id)),
        db
          .select({ count: count() })
          .from(dealOpportunities)
          .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
          .where(eq(companies.themeId, id)),
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

interface GetCompaniesByThemeResult {
  data: Company[];
  totalCount: number;
  totalPages: number;
}

/**
 * Get companies for a specific theme
 */
export const GetCompaniesByThemeId = async ({
  themeId,
  offset = 0,
  limit = 50,
}: {
  themeId: string;
  offset?: number;
  limit?: number;
}): Promise<GetCompaniesByThemeResult> => {
  try {
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(companies)
        .where(eq(companies.themeId, themeId))
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(companies)
        .where(eq(companies.themeId, themeId)),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select companies by themeId", error);
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
      .where(eq(companies.themeId, themeId))
      .orderBy(desc(dealOpportunities.createdAt));

    return rows;
  } catch (error) {
    console.error(
      "Failed query: select deal opportunities by themeId",
      error,
    );
    throw error;
  }
};

export interface ScreenedDealOpportunity {
  opportunity: typeof dealOpportunities.$inferSelect;
  company: { name: string; industry: string | null; location: string | null } | null;
  screenings: (typeof aiScreenings.$inferSelect)[];
}

/**
 * Get all deal opportunities that have AI screenings attached
 */
export const GetDealOpportunitiesWithScreenings =
  async (): Promise<ScreenedDealOpportunity[]> => {
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
        .orderBy(
          desc(dealOpportunities.createdAt),
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

