import { leads, companies } from "../schema";
import type { Lead } from "../schema";
import { db } from "../index";
import { eq, and, desc, count, isNull } from "drizzle-orm";
import { withOrganizationScope } from "./org-scope";

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
  organizationId,
}: {
  offset?: number;
  limit?: number;
  organizationId?: string | null;
}): Promise<GetLeadsResult> => {
  try {
    const whereClause = withOrganizationScope(
      leads.organizationId,
      organizationId,
      isNull(leads.deletedAt),
    );
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(leads)
        .where(whereClause)
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(leads).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select from Lead", error);
    throw error;
  }
};

