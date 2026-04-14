import {
  investors,
  investorLeads,
  investorInteractions,
  investorCompanyLinks,
  investorDealOpportunityLinks,
  companies,
  dealOpportunities,
} from "../schema";
import type { Investor, InvestorLead } from "../schema";
import { db } from "../index";
import { eq, desc, count } from "drizzle-orm";

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

