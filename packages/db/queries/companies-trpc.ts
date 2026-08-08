import { db } from "../index";
import { companies } from "../schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { ilike } from "../sqlite-helpers";
import { withOrganizationScope } from "./org-scope";

export async function listCompaniesForSelect(organizationId?: string | null) {
  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(
      withOrganizationScope(
        companies.organizationId,
        organizationId,
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(asc(companies.name));
}

export async function searchCompaniesForChat(input: {
  query?: string;
  limit: number;
  organizationId?: string | null;
}) {
  const conditions = [
    withOrganizationScope(
      companies.organizationId,
      input.organizationId,
      isNull(companies.deletedAt),
    ),
  ];
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

