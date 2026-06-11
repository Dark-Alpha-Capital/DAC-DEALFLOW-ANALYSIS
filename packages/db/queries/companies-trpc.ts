import { db } from "../index";
import { companies, dealOpportunities } from "../schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { ilike } from "../sqlite-helpers";

export async function listCompaniesForSelect() {
  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(isNull(companies.deletedAt))
    .orderBy(asc(companies.name));
}

export async function searchCompaniesForChat(input: {
  query?: string;
  limit: number;
}) {
  const conditions = [isNull(companies.deletedAt)];
  if (input.query) {
    conditions.push(ilike(companies.name, `%${input.query}%`));
  }
  return db
    .select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
      location: companies.location,
    })
    .from(companies)
    .where(and(...conditions))
    .orderBy(input.query ? asc(companies.name) : desc(companies.updatedAt))
    .limit(input.limit);
}

export async function listDealOpportunityIdsForCompany(companyId: string) {
  return db
    .select({ id: dealOpportunities.id })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.companyId, companyId));
}
