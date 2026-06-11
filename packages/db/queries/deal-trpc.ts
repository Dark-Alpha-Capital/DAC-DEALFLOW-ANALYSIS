import { db } from "../index";
import {
  companies,
  dealOpportunities,
  dealOpportunityCompanyLinks,
  investorDealOpportunityLinks,
  investors,
  leads,
  documents,
} from "../schema";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { ilike } from "../sqlite-helpers";

export async function searchDealOpportunitiesForChat(input: {
  query?: string;
  limit: number;
}) {
  const predicates = [isNull(companies.deletedAt)];
  if (input.query) {
    const searchTerm = `%${input.query}%`;
    predicates.push(
      or(
        ilike(companies.name, searchTerm),
        ilike(dealOpportunities.title, searchTerm),
        ilike(dealOpportunities.dealTeaser, searchTerm),
        ilike(dealOpportunities.sourceWebsite, searchTerm),
        ilike(dealOpportunities.brokerage, searchTerm),
      )!,
    );
  }
  return db
    .select({
      id: dealOpportunities.id,
      companyId: dealOpportunities.companyId,
      leadId: dealOpportunities.leadId,
      title: dealOpportunities.title,
      dealTeaser: dealOpportunities.dealTeaser,
      stage: dealOpportunities.stage,
      status: dealOpportunities.status,
      companyName: companies.name,
      sourceWebsite: dealOpportunities.sourceWebsite,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(and(...predicates))
    .orderBy(desc(dealOpportunities.updatedAt), desc(dealOpportunities.id))
    .limit(input.limit);
}

export async function findDealOpportunityDocumentByContentHash(
  dealOpportunityId: string,
  contentHash: string,
) {
  const [row] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.dealOpportunityId, dealOpportunityId),
        eq(documents.contentHash, contentHash),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getDocumentFileMetaById(documentId: string) {
  const [doc] = await db
    .select({
      fileName: documents.fileName,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  return doc ?? null;
}

export async function listDealOpportunityCompanyLinksJoined(
  dealOpportunityId: string,
) {
  return db
    .select({
      link: dealOpportunityCompanyLinks,
      company: {
        id: companies.id,
        name: companies.name,
        industry: companies.industry,
        location: companies.location,
      },
    })
    .from(dealOpportunityCompanyLinks)
    .innerJoin(
      companies,
      eq(dealOpportunityCompanyLinks.companyId, companies.id),
    )
    .where(
      and(
        eq(
          dealOpportunityCompanyLinks.dealOpportunityId,
          dealOpportunityId,
        ),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(desc(dealOpportunityCompanyLinks.createdAt));
}

export async function getDealOpportunityIdAndPrimaryCompany(
  dealOpportunityId: string,
) {
  const [opp] = await db
    .select({
      id: dealOpportunities.id,
      companyId: dealOpportunities.companyId,
    })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.id, dealOpportunityId))
    .limit(1);
  return opp ?? null;
}

export async function getCompanyIdExists(companyId: string) {
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return company ?? null;
}

export async function findDealOpportunityCompanyLinkDup(
  dealOpportunityId: string,
  companyId: string,
) {
  const [dup] = await db
    .select({ id: dealOpportunityCompanyLinks.id })
    .from(dealOpportunityCompanyLinks)
    .where(
      and(
        eq(dealOpportunityCompanyLinks.dealOpportunityId, dealOpportunityId),
        eq(dealOpportunityCompanyLinks.companyId, companyId),
      ),
    )
    .limit(1);
  return dup ?? null;
}

export async function getLatestCompanyLinkForDealOpportunity(
  dealOpportunityId: string,
) {
  const [fallback] = await db
    .select({ companyId: dealOpportunityCompanyLinks.companyId })
    .from(dealOpportunityCompanyLinks)
    .where(eq(dealOpportunityCompanyLinks.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(dealOpportunityCompanyLinks.createdAt))
    .limit(1);
  return fallback ?? null;
}

export async function listInvestorDealOpportunityLinksJoined(
  dealOpportunityId: string,
) {
  return db
    .select({
      link: investorDealOpportunityLinks,
      investor: {
        id: investors.id,
        name: investors.name,
        type: investors.type,
        status: investors.status,
      },
    })
    .from(investorDealOpportunityLinks)
    .innerJoin(
      investors,
      eq(investorDealOpportunityLinks.investorId, investors.id),
    )
    .where(
      eq(investorDealOpportunityLinks.dealOpportunityId, dealOpportunityId),
    )
    .orderBy(desc(investorDealOpportunityLinks.createdAt));
}

export async function getDealOpportunityIdOnly(dealOpportunityId: string) {
  const [opp] = await db
    .select({ id: dealOpportunities.id })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.id, dealOpportunityId))
    .limit(1);
  return opp ?? null;
}

export async function getInvestorIdExists(investorId: string) {
  const [investor] = await db
    .select({ id: investors.id })
    .from(investors)
    .where(eq(investors.id, investorId))
    .limit(1);
  return investor ?? null;
}

export async function findInvestorDealOpportunityLinkDup(
  dealOpportunityId: string,
  investorId: string,
) {
  const [dup] = await db
    .select({ id: investorDealOpportunityLinks.id })
    .from(investorDealOpportunityLinks)
    .where(
      and(
        eq(investorDealOpportunityLinks.dealOpportunityId, dealOpportunityId),
        eq(investorDealOpportunityLinks.investorId, investorId),
      ),
    )
    .limit(1);
  return dup ?? null;
}

export async function getCompanyRowByIdForDealUpload(companyId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId));
  return company ?? null;
}

export async function findDealUploadDocumentByHash(
  dealOpportunityId: string,
  contentHash: string,
) {
  const [row] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.dealOpportunityId, dealOpportunityId),
        eq(documents.contentHash, contentHash),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getLeadRowById(leadId: string) {
  const [row] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return row ?? null;
}

export async function getCompanyRowByIdForAiScreening(companyId: string) {
  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
    .limit(1);
  return company ?? null;
}

export async function selectDealOpportunityBitrixIds(bitrixIds: string[]) {
  if (bitrixIds.length === 0) return [];
  return db
    .select({ bitrixId: dealOpportunities.bitrixId })
    .from(dealOpportunities)
    .where(inArray(dealOpportunities.bitrixId, bitrixIds));
}
