import {
  companies,
  dealOpportunities,
  dealOpportunityThemes,
  themes,
  documents,
  contacts,
  companyNotes,
  companyFinancialSnapshots,
  investors,
  investorCompanyLinks,
  outreach,
  users,
  dealOpportunityCompanyLinks,
} from "../schema";
import type { Company } from "../schema";
import { db } from "../index";
import {
  eq,
  and,
  or,
  desc,
  inArray,
  count,
  isNull,
} from "drizzle-orm";

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

