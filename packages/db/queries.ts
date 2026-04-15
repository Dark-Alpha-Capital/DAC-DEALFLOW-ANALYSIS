// Import schema first to ensure all tables are initialized
import {
  deals,
  leads,
  users,
  screeners,
  screenerQuestions,
  screenerResponses,
  aiScreenings,
  dealOpportunityScreenings,
  documents,
  dealOpportunities,
  dealOpportunityThemes,
  companies,
  companyNotes,
  themes,
  contacts,
  outreach,
  dealOpportunityCompanyLinks,
  industryIntelligence,
  themePerformance,
  theses,
  themeCompanyCoverage,
  cimExtractions,
  dealCims,
  dealFinancialSnapshots,
  companyFinancialSnapshots,
  dealRiskFlags,
  investors,
  investorDealOpportunityLinks,
  investorLeads,
  investorInteractions,
  investorCompanyLinks,
  cimScreeningSessions,
  cimScreeningRuns,
  cimScreeningAnswers,
  documentChunks,
  type Deal,
  type Lead,
  type Company,
  type Investor,
  type InvestorLead,
} from "./schema";
import type { DealType, DealStatus } from "./enums";
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
  isNull,
} from "drizzle-orm";
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
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)));
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
      .select({ company: companies })
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)));

    if (!companyRow) {
      return null;
    }

    const [
      companyDealOpps,
      companyLinkedDealOppRows,
      primaryThemeRows,
      companyDocuments,
      companyContacts,
      companyNotesRows,
      companyFinancialSnapshotsRows,
      linkedInvestorRows,
    ] = await Promise.all([
      db
        .select()
        .from(dealOpportunities)
        .where(eq(dealOpportunities.companyId, id))
        .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id)),
      db
        .select({ dealOpportunity: dealOpportunities })
        .from(dealOpportunityCompanyLinks)
        .innerJoin(
          dealOpportunities,
          eq(dealOpportunityCompanyLinks.dealOpportunityId, dealOpportunities.id),
        )
        .where(eq(dealOpportunityCompanyLinks.companyId, id))
        .orderBy(
          desc(dealOpportunityCompanyLinks.createdAt),
          desc(dealOpportunities.createdAt),
          desc(dealOpportunities.id),
        ),
      db
        .select({ themeName: themes.name })
        .from(dealOpportunities)
        .innerJoin(
          dealOpportunityThemes,
          eq(dealOpportunityThemes.dealOpportunityId, dealOpportunities.id),
        )
        .innerJoin(themes, eq(dealOpportunityThemes.themeId, themes.id))
        .where(
          and(
            eq(dealOpportunities.companyId, id),
            eq(dealOpportunityThemes.isPrimary, true),
            isNull(themes.deletedAt),
          ),
        )
        .orderBy(desc(dealOpportunities.createdAt))
        .limit(1),
      db
        .select()
        .from(documents)
        .where(
          and(eq(documents.entityType, "COMPANY"), eq(documents.entityId, id)),
        ),
      db
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.entityType, "COMPANY"), eq(contacts.entityId, id)),
        ),
      db
        .select()
        .from(companyNotes)
        .where(eq(companyNotes.companyId, id))
        .orderBy(desc(companyNotes.createdAt)),
      db
        .select()
        .from(companyFinancialSnapshots)
        .where(eq(companyFinancialSnapshots.companyId, id))
        .orderBy(desc(companyFinancialSnapshots.periodEnd)),
      db
        .select({
          link: investorCompanyLinks,
          investor: investors,
        })
        .from(investorCompanyLinks)
        .innerJoin(
          investors,
          eq(investorCompanyLinks.investorId, investors.id),
        )
        .where(eq(investorCompanyLinks.companyId, id))
        .orderBy(desc(investorCompanyLinks.createdAt)),
    ]);

    const dealOpportunitiesById = new Map<string, (typeof companyDealOpps)[number]>();
    for (const dealOpp of companyDealOpps) {
      dealOpportunitiesById.set(dealOpp.id, dealOpp);
    }
    for (const row of companyLinkedDealOppRows) {
      dealOpportunitiesById.set(row.dealOpportunity.id, row.dealOpportunity);
    }
    const mergedDealOpps = Array.from(dealOpportunitiesById.values()).sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (bTs !== aTs) return bTs - aTs;
      return b.id.localeCompare(a.id);
    });

    const dealOppIds = mergedDealOpps.map((o) => o.id);
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
        themeName: primaryThemeRows[0]?.themeName ?? null,
      },
      dealOpportunities: mergedDealOpps,
      documents: companyDocuments,
      contacts: companyContacts,
      outreach: outreachRows,
      notes: companyNotesRows,
      financialSnapshots: companyFinancialSnapshotsRows,
      linkedInvestors: linkedInvestorRows,
    };
  } catch (error) {
    console.error("Error fetching company with relations", error);
    throw error;
  }
};

/**
 * List company financial snapshots ordered by periodEnd desc (time-series)
 */
export const ListCompanyFinancialSnapshots = async (companyId: string) => {
  return db
    .select()
    .from(companyFinancialSnapshots)
    .where(eq(companyFinancialSnapshots.companyId, companyId))
    .orderBy(desc(companyFinancialSnapshots.periodEnd));
};

/**
 * Get a lead by id
 */
export const GetLeadById = async (id: string) => {
  try {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
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
    .where(
      and(
        eq(companies.firstSeenFromLeadId, leadId),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(desc(companies.createdAt), desc(companies.id))
    .limit(1);
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
    const [legacyCreator] = deal.userId
      ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, deal.userId))
        .limit(1)
      : [];
    return {
      deal: deal as Deal & { id: string },
      creatorName: legacyCreator?.name ?? null,
      documents: [] as Awaited<ReturnType<typeof getDealDocuments>>,
      aiScreenings: [] as Awaited<
        ReturnType<typeof getAllDealReasoningsWithScreenerName>
      >,
      cimExtraction: null,
      cimScreeningRunsForDeal: [] as Awaited<
        ReturnType<typeof listCimScreeningRunsForDealOpportunity>
      >,
    };
  }

  const companyId = opp.companyId;

  const companyRows = companyId
    ? await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    : [];
  const company = companyRows[0];

  const [creatorRow] = opp.userId
    ? await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, opp.userId))
      .limit(1)
    : [];

  const companyDocsPromise = companyId
    ? db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.entityType, "COMPANY"),
          eq(documents.entityId, companyId),
        ),
      )
    : Promise.resolve([] as (typeof documents.$inferSelect)[]);

  const dealOppsByCompanyPromise = companyId
    ? db
      .select()
      .from(dealOpportunities)
      .where(eq(dealOpportunities.companyId, companyId))
      .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id))
    : Promise.resolve([] as (typeof dealOpportunities.$inferSelect)[]);

  const companyContactsPromise = companyId
    ? db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.entityType, "COMPANY"),
          eq(contacts.entityId, companyId),
        ),
      )
    : Promise.resolve([] as (typeof contacts.$inferSelect)[]);

  const outreachWhere = companyId
    ? or(
      eq(outreach.companyId, companyId),
      eq(outreach.dealOpportunityId, opp.id),
    )
    : eq(outreach.dealOpportunityId, opp.id);

  const companyNotesPromise = companyId
    ? db
      .select()
      .from(companyNotes)
      .where(eq(companyNotes.companyId, companyId))
      .orderBy(desc(companyNotes.createdAt))
    : Promise.resolve([] as (typeof companyNotes.$inferSelect)[]);

  const [
    dealDocs,
    companyDocs,
    screenings,
    deterministicScreening,
    dealOpportunitiesList,
    companyContacts,
    dealContacts,
    outreachRows,
    companyNotesRows,
    cimExtraction,
    latestSnapshot,
    financialSnapshots,
    riskFlags,
    cimScreeningRunsForDeal,
  ] = await Promise.all([
    getDealDocuments(opp.id),
    companyDocsPromise,
    getAllDealReasoningsWithScreenerNameByOpportunityId(opp.id),
    db
      .select()
      .from(dealOpportunityScreenings)
      .where(eq(dealOpportunityScreenings.dealOpportunityId, opp.id))
      .limit(1),
    dealOppsByCompanyPromise,
    companyContactsPromise,
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
      .where(outreachWhere)
      .orderBy(desc(outreach.createdAt)),
    companyNotesPromise,
    GetCIMExtractionByDealOpportunityId(opp.id).catch(() => null),
    GetLatestDealFinancialSnapshotByDealOpportunityId(opp.id),
    GetDealFinancialSnapshotsByDealOpportunityId(opp.id),
    GetDealRiskFlagsByDealOpportunityId(opp.id),
    listCimScreeningRunsForDealOpportunity(opp.id),
  ]);

  const resolvedRevenue =
    latestSnapshot?.revenue ?? opp.revenue ?? company?.revenueEstimate ?? 0;
  const resolvedEbitda =
    latestSnapshot?.ebitda ?? opp.ebitda ?? company?.ebitdaEstimate ?? 0;
  const resolvedEbitdaMargin =
    latestSnapshot?.ebitdaMargin ??
    opp.ebitdaMargin ??
    company?.ebitdaMarginEstimate ??
    0;
  const resolvedAskingPrice = latestSnapshot?.askingPrice ?? opp.askingPrice;

  const dealView: Deal & { id: string } = {
    id: opp.id,
    dealCaption:
      company?.name ??
      opp.title?.trim() ??
      opp.dealTeaser?.trim() ??
      "",
    revenue: resolvedRevenue,
    ebitda: resolvedEbitda,
    ebitdaMargin: resolvedEbitdaMargin,
    brokerage: opp.brokerage ?? "",
    industry: company?.industry ?? "",
    companyLocation:
      opp.companyLocation?.trim() || company?.location || null,
    sourceWebsite: opp.sourceWebsite ?? "",
    dealType: opp.dealType,
    status: opp.status,
    askingPrice: resolvedAskingPrice,
    grossRevenue: company?.revenueEstimate ?? null,
    firstName: opp.brokerFirstName,
    lastName: opp.brokerLastName,
    workPhone: opp.brokerPhone,
    email: opp.brokerEmail,
    title: null,
    linkedinUrl: opp.brokerLinkedIn,
    dealTeaser: opp.dealTeaser,
    tags: opp.tags ?? [],
    reviewState: opp.reviewState,
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
    creatorName: creatorRow?.name ?? null,
    currentOpportunity: opp,
    documents: dealDocs ?? [],
    aiScreenings: screenings ?? [],
    deterministicScreening: deterministicScreening[0] ?? null,
    company: company ?? null,
    dealOpportunities: dealOpportunitiesList ?? [],
    companyContacts: companyContacts ?? [],
    dealContacts: dealContacts ?? [],
    outreach: outreachRows ?? [],
    companyDocuments: companyDocs ?? [],
    dealDocuments: dealDocs ?? [],
    companyNotes: companyNotesRows ?? [],
    cimExtraction: cimExtraction ?? null,
    latestFinancialSnapshot: latestSnapshot ?? null,
    financialSnapshots: financialSnapshots ?? [],
    riskFlags: riskFlags ?? [],
    cimScreeningRunsForDeal: cimScreeningRunsForDeal ?? [],
  };
};

async function getDealDocuments(dealOpportunityId: string) {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "DEAL_OPPORTUNITY"),
        eq(documents.entityId, dealOpportunityId),
      ),
    );
}

/**
 * Get active CIM upload for a deal opportunity.
 */
export const getActiveCimForDeal = async (dealOpportunityId: string) => {
  const [row] = await db
    .select()
    .from(dealCims)
    .where(
      and(
        eq(dealCims.dealOpportunityId, dealOpportunityId),
        eq(dealCims.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return row ?? null;
};

/**
 * Get CIM extraction for the active DealCim of a deal opportunity.
 * Falls back to legacy extraction by dealOpportunityId if no active CIM row.
 */
export const GetCIMExtractionByDealOpportunityId = async (
  dealOpportunityId: string,
) => {
  try {
    const activeCim = await getActiveCimForDeal(dealOpportunityId);
    if (activeCim) {
      const [row] = await db
        .select({
          extraction: cimExtractions,
          documentFileName: documents.fileName,
          documentCreatedAt: documents.createdAt,
        })
        .from(cimExtractions)
        .innerJoin(dealCims, eq(cimExtractions.dealCimId, dealCims.id))
        .leftJoin(documents, eq(dealCims.documentId, documents.id))
        .where(eq(cimExtractions.dealCimId, activeCim.id))
        .limit(1);
      return row?.extraction
        ? {
          ...row.extraction,
          documentFileName: row.documentFileName,
          documentCreatedAt: row.documentCreatedAt,
        }
        : null;
    }
    // Legacy: extraction by dealOpportunityId (pre-migration or denormalized)
    const [legacyRow] = await db
      .select({
        extraction: cimExtractions,
        documentFileName: documents.fileName,
        documentCreatedAt: documents.createdAt,
      })
      .from(cimExtractions)
      .leftJoin(documents, eq(cimExtractions.documentId, documents.id))
      .where(eq(cimExtractions.dealOpportunityId, dealOpportunityId))
      .limit(1);
    return legacyRow?.extraction
      ? {
        ...legacyRow.extraction,
        documentFileName: legacyRow.documentFileName,
        documentCreatedAt: legacyRow.documentCreatedAt,
      }
      : null;
  } catch {
    return null;
  }
};

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
    conditions.push(
      inArray(deals.reviewState, ["SEEN", "REVIEWED", "PUBLISHED"]),
    );
  }
  if (showReviewed) {
    conditions.push(inArray(deals.reviewState, ["REVIEWED", "PUBLISHED"]));
  }
  if (showPublished) {
    conditions.push(eq(deals.reviewState, "PUBLISHED"));
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
        category: screeners.category,
        description: screeners.description,
        createdAt: screeners.createdAt,
        updatedAt: screeners.updatedAt,
        questionCount: sql<number>`count(${screenerQuestions.id})`
          .mapWith(Number)
          .as("questionCount"),
        totalWeight: sql<number>`coalesce(sum(${screenerQuestions.weight}), 0)`
          .mapWith(Number)
          .as("totalWeight"),
      })
      .from(screeners)
      .leftJoin(
        screenerQuestions,
        eq(screenerQuestions.screenerId, screeners.id),
      )
      .groupBy(
        screeners.id,
        screeners.name,
        screeners.category,
        screeners.description,
        screeners.createdAt,
        screeners.updatedAt,
      )
      .orderBy(asc(screeners.name));
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
  return getAllScreeners();
}

export async function getScreenerById(screenerId: string) {
  try {
    const [row] = await db
      .select({
        id: screeners.id,
        name: screeners.name,
        category: screeners.category,
        description: screeners.description,
        createdAt: screeners.createdAt,
        updatedAt: screeners.updatedAt,
      })
      .from(screeners)
      .where(eq(screeners.id, screenerId))
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("Error fetching screener by id", error);
    return null;
  }
}

export async function getScreenerQuestions(screenerId: string) {
  try {
    return await db
      .select({
        id: screenerQuestions.id,
        screenerId: screenerQuestions.screenerId,
        question: screenerQuestions.question,
        weight: screenerQuestions.weight,
        responseType: screenerQuestions.responseType,
        position: screenerQuestions.position,
        createdAt: screenerQuestions.createdAt,
        updatedAt: screenerQuestions.updatedAt,
      })
      .from(screenerQuestions)
      .where(eq(screenerQuestions.screenerId, screenerId))
      .orderBy(
        asc(screenerQuestions.position),
        asc(screenerQuestions.createdAt),
      );
  } catch (error) {
    console.error("Error fetching screener questions", error);
    return [];
  }
}

export async function getScreenerWithQuestions(screenerId: string) {
  const [screener, questions] = await Promise.all([
    getScreenerById(screenerId),
    getScreenerQuestions(screenerId),
  ]);

  if (!screener) {
    return null;
  }

  return {
    ...screener,
    questions,
  };
}

export async function getScreenerResponsesByDealOpportunityId(
  dealOpportunityId: string,
  screenerId: string,
) {
  try {
    const [questions, responses] = await Promise.all([
      getScreenerQuestions(screenerId),
      db
        .select({
          id: screenerResponses.id,
          dealOpportunityId: screenerResponses.dealOpportunityId,
          questionId: screenerResponses.questionId,
          score: screenerResponses.score,
          source: screenerResponses.source,
          notes: screenerResponses.notes,
          createdAt: screenerResponses.createdAt,
          updatedAt: screenerResponses.updatedAt,
        })
        .from(screenerResponses)
        .innerJoin(
          screenerQuestions,
          eq(screenerQuestions.id, screenerResponses.questionId),
        )
        .where(
          and(
            eq(screenerResponses.dealOpportunityId, dealOpportunityId),
            eq(screenerQuestions.screenerId, screenerId),
          ),
        ),
    ]);

    const responseMap = new Map(
      responses.map((response) => [
        `${response.questionId}:${response.source}`,
        response,
      ]),
    );

    return questions.map((question) => ({
      ...question,
      aiResponse: responseMap.get(`${question.id}:AI`) ?? null,
      humanResponse: responseMap.get(`${question.id}:HUMAN`) ?? null,
    }));
  } catch (error) {
    console.error("Error fetching screener responses", error);
    return [];
  }
}

/**
 * Get all deal reasonings with screener name (by dealOpportunityId)
 */
export async function getAllDealReasoningsWithScreenerNameByOpportunityId(
  dealOpportunityId: string,
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
      error,
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
        .where(isNull(leads.deletedAt))
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(leads).where(isNull(leads.deletedAt)),
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
    company: {
      name: string;
      industry: string | null;
      location: string | null;
    } | null;
  }>;
  totalCount: number;
  totalPages: number;
}

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
        .leftJoin(
          themes,
          and(eq(companies.themeId, themes.id), isNull(themes.deletedAt)),
        )
        .where(isNull(companies.deletedAt))
        .orderBy(desc(companies.createdAt), desc(companies.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(companies)
        .where(isNull(companies.deletedAt)),
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

// ----------------------------------------------------------------------------
// Capital CRM layer
// ----------------------------------------------------------------------------

interface GetInvestorsResult {
  data: Investor[];
  totalCount: number;
  totalPages: number;
}

export const GetAllInvestors = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetInvestorsResult> => {
  try {
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(investors)
        .orderBy(desc(investors.createdAt), desc(investors.id))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(investors),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from Investor", error);
    throw error;
  }
};

interface GetInvestorLeadsResult {
  data: InvestorLead[];
  totalCount: number;
  totalPages: number;
}

export const GetAllInvestorLeads = async ({
  offset = 0,
  limit = 50,
}: {
  offset?: number;
  limit?: number;
}): Promise<GetInvestorLeadsResult> => {
  try {
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(investorLeads)
        .orderBy(desc(investorLeads.createdAt), desc(investorLeads.id))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(investorLeads),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from InvestorLead", error);
    throw error;
  }
};

export const GetInvestorById = async (id: string) => {
  try {
    const [investor] = await db
      .select()
      .from(investors)
      .where(eq(investors.id, id));
    return investor ?? null;
  } catch (error) {
    console.error("Error fetching investor by id", error);
    throw error;
  }
};

export const GetInvestorLeadById = async (id: string) => {
  try {
    const [lead] = await db
      .select()
      .from(investorLeads)
      .where(eq(investorLeads.id, id));
    return lead ?? null;
  } catch (error) {
    console.error("Error fetching investor lead by id", error);
    throw error;
  }
};

export const GetInvestorWithRelations = async (id: string) => {
  try {
    const [investor] = await db
      .select()
      .from(investors)
      .where(eq(investors.id, id));

    if (!investor) return null;

    const interactions = await db
      .select()
      .from(investorInteractions)
      .where(eq(investorInteractions.investorId, id))
      .orderBy(desc(investorInteractions.createdAt));

    let linkedCompanies: {
      link: typeof investorCompanyLinks.$inferSelect;
      company: typeof companies.$inferSelect;
    }[] = [];
    let linkedDealOpportunities: (typeof dealOpportunities.$inferSelect)[] = [];
    try {
      linkedCompanies = await db
        .select({
          link: investorCompanyLinks,
          company: companies,
        })
        .from(investorCompanyLinks)
        .innerJoin(companies, eq(investorCompanyLinks.companyId, companies.id))
        .where(eq(investorCompanyLinks.investorId, id))
        .orderBy(desc(investorCompanyLinks.createdAt));
    } catch (linkErr) {
      console.error(
        "Investor-company link query failed (ensure InvestorCompanyLink exists: db:push or db:migrate in packages/db)",
        linkErr,
      );
    }

    try {
      const linkedDealRows = await db
        .select({ dealOpportunity: dealOpportunities })
        .from(investorDealOpportunityLinks)
        .innerJoin(
          dealOpportunities,
          eq(investorDealOpportunityLinks.dealOpportunityId, dealOpportunities.id),
        )
        .where(eq(investorDealOpportunityLinks.investorId, id))
        .orderBy(
          desc(investorDealOpportunityLinks.createdAt),
          desc(dealOpportunities.createdAt),
          desc(dealOpportunities.id),
        );
      linkedDealOpportunities = linkedDealRows.map((row) => row.dealOpportunity);
    } catch (linkErr) {
      console.error(
        "Investor-deal link query failed (ensure InvestorDealOpportunityLink exists: db:push or db:migrate in packages/db)",
        linkErr,
      );
    }

    return {
      investor,
      interactions,
      linkedCompanies,
      linkedDealOpportunities,
    };
  } catch (error) {
    console.error("Error fetching investor with relations", error);
    throw error;
  }
};

/** Company links for an investor (for edit flows). */
export const GetInvestorCompanyLinksByInvestorId = async (
  investorId: string,
) => {
  try {
    return await db
      .select({
        link: investorCompanyLinks,
        company: companies,
      })
      .from(investorCompanyLinks)
      .innerJoin(companies, eq(investorCompanyLinks.companyId, companies.id))
      .where(eq(investorCompanyLinks.investorId, investorId))
      .orderBy(desc(investorCompanyLinks.createdAt));
  } catch (error) {
    console.error(
      "Error fetching investor-company links (ensure InvestorCompanyLink exists: db:push or db:migrate in packages/db)",
      error,
    );
    return [];
  }
};

export const GetInvestorLeadWithRelations = async (id: string) => {
  try {
    const [lead] = await db
      .select()
      .from(investorLeads)
      .where(eq(investorLeads.id, id));

    if (!lead) return null;

    const interactions = await db
      .select()
      .from(investorInteractions)
      .where(eq(investorInteractions.investorLeadId, id))
      .orderBy(desc(investorInteractions.createdAt));

    return { lead, interactions };
  } catch (error) {
    console.error("Error fetching investor lead with relations", error);
    throw error;
  }
};

export const GetInvestorByFirstSeenFromInvestorLeadId = async (
  investorLeadId: string,
) => {
  try {
    const [investor] = await db
      .select()
      .from(investors)
      .where(eq(investors.firstSeenFromInvestorLeadId, investorLeadId))
      .orderBy(desc(investors.createdAt), desc(investors.id))
      .limit(1);
    return investor ?? null;
  } catch (error) {
    console.error(
      "Error fetching investor by firstSeenFromInvestorLeadId",
      error,
    );
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

/**
 * Get documents attached to a theme
 */
export const GetThemeDocuments = async (themeId: string) => {
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.entityType, "THEME"), eq(documents.entityId, themeId)),
      );

    return docs;
  } catch (error) {
    console.error("Failed query: select documents for theme", error);
    throw error;
  }
};

/**
 * Get firm-level (global) documents
 */
export const GetGlobalDocuments = async () => {
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.entityType, "GLOBAL"))
      .orderBy(desc(documents.createdAt));

    return docs;
  } catch (error) {
    console.error("Failed query: select global documents", error);
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
  entityType,
}: {
  offset?: number;
  limit?: number;
  entityType?: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY" | "THEME" | "GLOBAL";
}): Promise<GetAllDocumentsResult> => {
  try {
    const whereClause = entityType
      ? eq(documents.entityType, entityType)
      : undefined;

    const [data, countResult] = await Promise.all([
      whereClause
        ? db
          .select()
          .from(documents)
          .where(whereClause)
          .orderBy(desc(documents.createdAt))
          .limit(limit)
          .offset(offset)
        : db
          .select()
          .from(documents)
          .orderBy(desc(documents.createdAt))
          .limit(limit)
          .offset(offset),
      whereClause
        ? db.select({ count: count() }).from(documents).where(whereClause)
        : db.select({ count: count() }).from(documents),
    ]);

    const rawCount = countResult[0]?.count ?? 0;
    const totalCount = Number(rawCount);
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
        .where(and(eq(companies.themeId, themeId), isNull(companies.deletedAt)))
        .orderBy(desc(companies.createdAt), desc(companies.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(companies)
        .where(
          and(eq(companies.themeId, themeId), isNull(companies.deletedAt)),
        ),
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

export async function getCimScreeningSessionByIdForUser(
  sessionId: string,
  userId: string,
) {
  const [row] = await db
    .select()
    .from(cimScreeningSessions)
    .where(
      and(
        eq(cimScreeningSessions.id, sessionId),
        eq(cimScreeningSessions.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listCimScreeningSessionsForUser(
  userId: string,
  limit = 50,
) {
  return db
    .select()
    .from(cimScreeningSessions)
    .where(eq(cimScreeningSessions.userId, userId))
    .orderBy(desc(cimScreeningSessions.createdAt))
    .limit(limit);
}

export async function getCimScreeningAnswersByRunId(runId: string) {
  return db
    .select()
    .from(cimScreeningAnswers)
    .where(eq(cimScreeningAnswers.runId, runId));
}

/** Answers for a run with screener question text, ordered like the screener. */
export async function getCimScreeningAnswersWithQuestionsByRunId(runId: string) {
  return db
    .select({
      questionId: cimScreeningAnswers.questionId,
      questionText: screenerQuestions.question,
      position: screenerQuestions.position,
      score: cimScreeningAnswers.score,
      rationale: cimScreeningAnswers.rationale,
      evidenceChunkIds: cimScreeningAnswers.evidenceChunkIds,
    })
    .from(cimScreeningAnswers)
    .innerJoin(
      screenerQuestions,
      eq(cimScreeningAnswers.questionId, screenerQuestions.id),
    )
    .where(eq(cimScreeningAnswers.runId, runId))
    .orderBy(asc(screenerQuestions.position), asc(screenerQuestions.createdAt));
}

/** Load chunk excerpts for SIM screening evidence IDs (RAG retrieval citations). */
export async function getDocumentChunksByIds(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => id?.trim()))];
  if (unique.length === 0) return [];
  return db
    .select({
      id: documentChunks.id,
      chunkText: documentChunks.chunkText,
      pageNumber: documentChunks.pageNumber,
    })
    .from(documentChunks)
    .where(inArray(documentChunks.id, unique));
}

export async function getCimScreeningRunsBySessionId(sessionId: string) {
  return db
    .select({
      id: cimScreeningRuns.id,
      sessionId: cimScreeningRuns.sessionId,
      screenerId: cimScreeningRuns.screenerId,
      workflowInstanceId: cimScreeningRuns.workflowInstanceId,
      status: cimScreeningRuns.status,
      errorMessage: cimScreeningRuns.errorMessage,
      createdAt: cimScreeningRuns.createdAt,
      updatedAt: cimScreeningRuns.updatedAt,
      screenerName: screeners.name,
      screenerCategory: screeners.category,
    })
    .from(cimScreeningRuns)
    .innerJoin(screeners, eq(cimScreeningRuns.screenerId, screeners.id))
    .where(eq(cimScreeningRuns.sessionId, sessionId))
    .orderBy(desc(cimScreeningRuns.createdAt));
}

/** All SIM / CIM template screening runs for sessions scoped to this deal opportunity. */
export async function listCimScreeningRunsForDealOpportunity(
  dealOpportunityId: string,
) {
  return db
    .select({
      runId: cimScreeningRuns.id,
      sessionId: cimScreeningSessions.id,
      status: cimScreeningRuns.status,
      errorMessage: cimScreeningRuns.errorMessage,
      workflowInstanceId: cimScreeningRuns.workflowInstanceId,
      screenerId: cimScreeningRuns.screenerId,
      screenerName: screeners.name,
      screenerCategory: screeners.category,
      runCreatedAt: cimScreeningRuns.createdAt,
      sessionCreatedAt: cimScreeningSessions.createdAt,
    })
    .from(cimScreeningRuns)
    .innerJoin(
      cimScreeningSessions,
      eq(cimScreeningRuns.sessionId, cimScreeningSessions.id),
    )
    .innerJoin(screeners, eq(cimScreeningRuns.screenerId, screeners.id))
    .where(eq(cimScreeningSessions.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(cimScreeningRuns.createdAt));
}

export type CimScreeningRunForDealRow = Awaited<
  ReturnType<typeof listCimScreeningRunsForDealOpportunity>
>[number];

export async function getCimScreeningRunByIdForUser(
  runId: string,
  userId: string,
) {
  const [row] = await db
    .select({ run: cimScreeningRuns })
    .from(cimScreeningRuns)
    .innerJoin(
      cimScreeningSessions,
      eq(cimScreeningRuns.sessionId, cimScreeningSessions.id),
    )
    .where(
      and(
        eq(cimScreeningRuns.id, runId),
        eq(cimScreeningSessions.userId, userId),
      ),
    )
    .limit(1);
  return row?.run ?? null;
}

/** True if this session has any run still in flight */
export async function countDocumentChunksByDealOpportunityId(
  dealOpportunityId: string,
) {
  const [row] = await db
    .select({ n: count() })
    .from(documentChunks)
    .where(eq(documentChunks.dealOpportunityId, dealOpportunityId));
  return Number(row?.n ?? 0);
}

export async function countDocumentChunksByDocumentId(documentId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));
  return Number(row?.n ?? 0);
}

/** Global CIM / legacy SIM screening uploads owned by the user (for picker + screening). */
export async function listCimScreeningLibraryDocumentsForUser(userId: string) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      ingestionStatus: documents.ingestionStatus,
      ingestionError: documents.ingestionError,
      createdAt: documents.createdAt,
      category: documents.category,
    })
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "GLOBAL"),
        eq(documents.uploadedById, userId),
        inArray(documents.category, ["CIM", "CIM_SCREENING"]),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function cimScreeningSessionHasActiveRun(sessionId: string) {
  const row = await db
    .select({ id: cimScreeningRuns.id })
    .from(cimScreeningRuns)
    .where(
      and(
        eq(cimScreeningRuns.sessionId, sessionId),
        inArray(cimScreeningRuns.status, [
          "PENDING",
          "INGESTING",
          "SCREENING",
        ]),
      ),
    )
    .limit(1);
  return row.length > 0;
}

export async function listCimScreeningSessionsForUserWithMeta(
  userId: string,
  limit = 50,
) {
  const rows = await db
    .select({
      id: cimScreeningSessions.id,
      createdAt: cimScreeningSessions.createdAt,
      documentId: cimScreeningSessions.documentId,
      dealOpportunityId: cimScreeningSessions.dealOpportunityId,
      docFileName: documents.fileName,
      docTitle: documents.title,
      dealTitle: dealOpportunities.title,
      dealTeaser: dealOpportunities.dealTeaser,
      dealDescription: dealOpportunities.description,
    })
    .from(cimScreeningSessions)
    .leftJoin(documents, eq(cimScreeningSessions.documentId, documents.id))
    .leftJoin(
      dealOpportunities,
      eq(cimScreeningSessions.dealOpportunityId, dealOpportunities.id),
    )
    .where(eq(cimScreeningSessions.userId, userId))
    .orderBy(desc(cimScreeningSessions.createdAt))
    .limit(limit);

  const base = rows.map((s) => {
    const headline = s.dealTitle?.trim() || s.dealTeaser?.trim() || null;
    const fileName =
      s.docFileName ??
      (headline
        ? headline.length > 120
          ? `${headline.slice(0, 120)}…`
          : headline
        : "Deal opportunity");
    const title = s.docTitle ?? s.dealDescription ?? "";
    return {
      id: s.id,
      createdAt: s.createdAt,
      documentId: s.documentId,
      dealOpportunityId: s.dealOpportunityId,
      fileName,
      title,
    };
  });

  if (base.length === 0) return [];

  const sessionIds = base.map((b) => b.id);
  const allRuns = await db
    .select({
      sessionId: cimScreeningRuns.sessionId,
      status: cimScreeningRuns.status,
      screenerName: screeners.name,
      createdAt: cimScreeningRuns.createdAt,
    })
    .from(cimScreeningRuns)
    .innerJoin(screeners, eq(cimScreeningRuns.screenerId, screeners.id))
    .where(inArray(cimScreeningRuns.sessionId, sessionIds))
    .orderBy(desc(cimScreeningRuns.createdAt));

  const runCountBySession = new Map<string, number>();
  const latestBySession = new Map<string, (typeof allRuns)[number]>();
  for (const r of allRuns) {
    runCountBySession.set(
      r.sessionId,
      (runCountBySession.get(r.sessionId) ?? 0) + 1,
    );
    if (!latestBySession.has(r.sessionId)) {
      latestBySession.set(r.sessionId, r);
    }
  }

  return base.map((s) => {
    const latest = latestBySession.get(s.id);
    return {
      ...s,
      runCount: runCountBySession.get(s.id) ?? 0,
      latestRunStatus: latest?.status ?? null,
      latestScreenerName: latest?.screenerName ?? null,
      latestRunAt: latest?.createdAt ?? null,
    };
  });
}

/** TRPC / app helpers live in `queries/deal-trpc.ts`; re-exported here because `@repo/db/queries` resolves to this file. */
export * from "./queries/deal-trpc";
export * from "./queries/companies-trpc";
export * from "./queries/themes-trpc";
export * from "./queries/leads-trpc";
export * from "./queries/analytics-trpc";
export * from "./queries/cim-screening-trpc";

export {
  normalizeStoredDealStageForPipeline,
  GetRankedDealOpportunityKanbanSummary,
  GetRankedDealOpportunitiesForKanbanColumnPaginated,
} from "./queries/deal-opportunity";
export type { GetRankedDealOpportunityKanbanSummaryResult } from "./queries/deal-opportunity";
