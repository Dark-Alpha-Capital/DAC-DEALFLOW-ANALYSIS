import {
  deals,
  users,
  documents,
  contacts,
  outreach,
  companyNotes,
  dealOpportunities,
  companies,
  dealOpportunityScreenings,
  type Deal,
} from "../schema";
import { db } from "../index";
import {
  eq,
  and,
  or,
  desc,
  isNull,
} from "drizzle-orm";
import { GetDealById } from "./deal";
import {
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
  GetLatestDealFinancialSnapshotByDealOpportunityId,
  GetDealFinancialSnapshotsByDealOpportunityId,
  GetDealRiskFlagsByDealOpportunityId,
} from "./deal-opportunity";
import { GetCIMExtractionByDealOpportunityId } from "./deal-cim";
import { getAllDealReasoningsWithScreenerNameByOpportunityId } from "./screeners";
import { listCimScreeningRunsForDealOpportunity } from "./cim-screening";

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
        ReturnType<typeof getAllDealReasoningsWithScreenerNameByOpportunityId>
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

