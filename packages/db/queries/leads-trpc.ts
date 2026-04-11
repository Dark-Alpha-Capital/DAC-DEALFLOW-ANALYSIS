import { db } from "../index";
import { leads, companies } from "../schema";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";

export async function searchLeadsForChat(input: {
  query?: string;
  limit: number;
}) {
  const predicates = [isNull(leads.deletedAt)];
  if (input.query) {
    const searchTerm = `%${input.query}%`;
    predicates.push(
      or(
        ilike(leads.rawTitle, searchTerm),
        ilike(leads.rawIndustry, searchTerm),
        ilike(leads.sourceWebsite, searchTerm),
        ilike(leads.normalizedCompanyName, searchTerm),
      )!,
    );
  }
  return db
    .select({
      id: leads.id,
      rawTitle: leads.rawTitle,
      rawIndustry: leads.rawIndustry,
      sourceWebsite: leads.sourceWebsite,
      companyLocation: leads.companyLocation,
      status: leads.status,
    })
    .from(leads)
    .where(and(...predicates))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(input.limit);
}

export async function getLeadForDuplicateCandidates(leadId: string) {
  const [lead] = await db
    .select({
      id: leads.id,
      normalizedCompanyName: leads.normalizedCompanyName,
      rawTitle: leads.rawTitle,
      companyLocation: leads.companyLocation,
      deletedAt: leads.deletedAt,
    })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return lead ?? null;
}

export async function listCompaniesForLeadDuplicateSearch(input: {
  searchTerm?: string;
  limit: number;
  wideLimit: number;
}) {
  const predicates = [isNull(companies.deletedAt)];
  if (input.searchTerm) {
    predicates.push(ilike(companies.name, `%${input.searchTerm}%`));
  }
  return db
    .select({
      id: companies.id,
      name: companies.name,
      normalizedName: companies.normalizedName,
      location: companies.location,
      industry: companies.industry,
    })
    .from(companies)
    .where(and(...predicates))
    .orderBy(desc(companies.updatedAt))
    .limit(input.searchTerm ? input.wideLimit : 100);
}

export async function getLeadStatusRow(leadId: string) {
  const [lead] = await db
    .select({
      id: leads.id,
      status: leads.status,
      duplicateCompanyId: leads.duplicateCompanyId,
      processedAt: leads.processedAt,
      deletedAt: leads.deletedAt,
    })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return lead ?? null;
}

export async function getCompanyExistsForLead(companyId: string) {
  const [company] = await db
    .select({ id: companies.id, deletedAt: companies.deletedAt })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return company ?? null;
}

export async function getLeadForClearDuplicate(leadId: string) {
  const [lead] = await db
    .select({
      id: leads.id,
      status: leads.status,
      duplicateCompanyId: leads.duplicateCompanyId,
      deletedAt: leads.deletedAt,
    })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return lead ?? null;
}
