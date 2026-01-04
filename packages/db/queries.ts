import { db } from ".";
import {
  deals,
  users,
  pocs,
  screeners,
  aiScreenings,
  rollups,
  companies,
  founders,
  files,
  dueDiligenceSections,
  reviews,
  tasks,
  dealDocuments,
  usersToRollups,
  type Deal,
  type DealType,
  type DealStatus,
} from "./schema";
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
import type { AdminUser, CompanyWithRelationsForList } from "./types";

/**
 * Get a deal by id
 * @param id - the id of the deal
 * @returns the deal
 */
export const GetDealById = async (id: string) => {
  "use cache";

  try {
    cacheTag("deal");
    cacheLife("hours");

    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal ?? null;
  } catch (error) {
    console.error("Error fetching deal by id", error);
    throw error;
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
 * Get a deal POC by deal id
 * @param dealId - the id of the deal
 * @returns the deal POC
 */
export const getDealPOC = async (dealId: string) => {
  try {
    return await db.select().from(pocs).where(eq(pocs.dealId, dealId));
  } catch (error) {
    console.error("Error fetching deal POC", error);
    throw new Error("Error fetching deal POC");
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
 * Get all deal reasonings with screener name
 * @param dealId - the id of the deal
 * @returns all deal reasonings with screener name
 */
export async function getAllDealReasoningsWithScreenerName(dealId: string) {
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
      .where(eq(aiScreenings.dealId, dealId))
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

/**
 * Get all rollups with their deals and users
 * @returns all rollups with relations
 */
export async function getAllRollups() {
  try {
    // Get all rollups
    const allRollups = await db
      .select()
      .from(rollups)
      .orderBy(desc(rollups.createdAt));

    // For each rollup, get users and deals
    const results = await Promise.all(
      allRollups.map(async (rollup) => {
        const [rollupUsers, rollupDeals] = await Promise.all([
          db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
            })
            .from(usersToRollups)
            .innerJoin(users, eq(usersToRollups.B, users.id))
            .where(eq(usersToRollups.A, rollup.id)),
          db.select().from(deals).where(eq(deals.rollupId, rollup.id)),
        ]);

        return {
          ...rollup,
          users: rollupUsers,
          deals: rollupDeals,
        };
      })
    );

    return results;
  } catch (error) {
    console.error("Error fetching all rollups", error);
    return null;
  }
}

/**
 * Get a rollup by id with its deals and users
 * @param rollupId - the id of the rollup
 * @returns the rollup with relations
 */
export async function getRollupById(rollupId: string) {
  try {
    const [rollup] = await db
      .select()
      .from(rollups)
      .where(eq(rollups.id, rollupId));

    if (!rollup) return null;

    const [rollupUsers, rollupDeals] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        })
        .from(usersToRollups)
        .innerJoin(users, eq(usersToRollups.B, users.id))
        .where(eq(usersToRollups.A, rollup.id)),
      db.select().from(deals).where(eq(deals.rollupId, rollup.id)),
    ]);

    return {
      ...rollup,
      users: rollupUsers,
      deals: rollupDeals,
    };
  } catch (error) {
    console.error("Error fetching rollup by id", error);
    return null;
  }
}

/**
 * Get a company by id
 * @param id - the id of the company
 * @returns the company
 */
export async function getCompanyById(id: string) {
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));

    if (!company) return null;

    const [
      companyFounders,
      companyFiles,
      companySections,
      companyReviews,
      companyTasks,
      counts,
    ] = await Promise.all([
      db.select().from(founders).where(eq(founders.companyId, id)),
      db
        .select()
        .from(files)
        .where(eq(files.companyId, id))
        .orderBy(desc(files.createdAt)),
      db
        .select()
        .from(dueDiligenceSections)
        .where(eq(dueDiligenceSections.companyId, id))
        .orderBy(desc(dueDiligenceSections.createdAt)),
      db
        .select({
          id: reviews.id,
          title: reviews.title,
          content: reviews.content,
          riskLevel: reviews.riskLevel,
          confidence: reviews.confidence,
          companyId: reviews.companyId,
          sectionId: reviews.sectionId,
          reviewerId: reviews.reviewerId,
          createdAt: reviews.createdAt,
          updatedAt: reviews.updatedAt,
          reviewer: {
            name: users.name,
            email: users.email,
          },
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.companyId, id))
        .orderBy(desc(reviews.createdAt)),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          companyId: tasks.companyId,
          sectionId: tasks.sectionId,
          assignedToId: tasks.assignedToId,
          createdById: tasks.createdById,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(eq(tasks.companyId, id))
        .orderBy(desc(tasks.createdAt)),
      Promise.all([
        db
          .select({ count: count() })
          .from(files)
          .where(eq(files.companyId, id)),
        db
          .select({ count: count() })
          .from(dueDiligenceSections)
          .where(eq(dueDiligenceSections.companyId, id)),
        db
          .select({ count: count() })
          .from(reviews)
          .where(eq(reviews.companyId, id)),
        db
          .select({ count: count() })
          .from(tasks)
          .where(eq(tasks.companyId, id)),
      ]),
    ]);

    // Get assignedTo and createdBy for tasks
    const tasksWithRelations = await Promise.all(
      companyTasks.map(async (task) => {
        const [assignedTo, createdBy] = await Promise.all([
          db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, task.assignedToId)),
          db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, task.createdById)),
        ]);
        return {
          ...task,
          assignedTo: assignedTo[0] ?? null,
          createdBy: createdBy[0] ?? null,
        };
      })
    );

    return {
      ...company,
      founders: companyFounders,
      files: companyFiles,
      sections: companySections,
      reviews: companyReviews,
      tasks: tasksWithRelations,
      _count: {
        files: counts[0][0]?.count ?? 0,
        sections: counts[1][0]?.count ?? 0,
        reviews: counts[2][0]?.count ?? 0,
        tasks: counts[3][0]?.count ?? 0,
      },
    };
  } catch (error) {
    console.error("Error fetching company by id", error);
    return null;
  }
}

/**
 * Minimal user list for Admin table
 * Selects only the fields required by the UI.
 */
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

interface GetCompaniesResult {
  companies: CompanyWithRelationsForList[];
  totalCount: number;
  totalPages: number;
}

export default async function GetCompanies({
  search,
  offset = 0,
  limit = 20,
}: {
  search?: string | undefined;
  offset?: number;
  limit?: number;
}): Promise<GetCompaniesResult> {
  try {
    const conditions = search
      ? or(
          ilike(companies.name, `%${search}%`),
          ilike(companies.sector, `%${search}%`),
          ilike(companies.headquarters, `%${search}%`)
        )
      : undefined;

    const [companiesList, countResult] = await Promise.all([
      db
        .select()
        .from(companies)
        .where(conditions)
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(companies).where(conditions),
    ]);

    const totalCount = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Get relations for each company
    const companiesWithRelations = await Promise.all(
      companiesList.map(async (company) => {
        const [companyFounders, companyFiles, companySections, counts] =
          await Promise.all([
            db
              .select()
              .from(founders)
              .where(eq(founders.companyId, company.id)),
            db
              .select()
              .from(files)
              .where(eq(files.companyId, company.id))
              .orderBy(desc(files.createdAt))
              .limit(3),
            db
              .select()
              .from(dueDiligenceSections)
              .where(eq(dueDiligenceSections.companyId, company.id))
              .orderBy(desc(dueDiligenceSections.createdAt))
              .limit(3),
            Promise.all([
              db
                .select({ count: count() })
                .from(files)
                .where(eq(files.companyId, company.id)),
              db
                .select({ count: count() })
                .from(dueDiligenceSections)
                .where(eq(dueDiligenceSections.companyId, company.id)),
              db
                .select({ count: count() })
                .from(reviews)
                .where(eq(reviews.companyId, company.id)),
              db
                .select({ count: count() })
                .from(tasks)
                .where(eq(tasks.companyId, company.id)),
            ]),
          ]);

        return {
          ...company,
          founders: companyFounders,
          files: companyFiles,
          sections: companySections,
          _count: {
            files: counts[0][0]?.count ?? 0,
            sections: counts[1][0]?.count ?? 0,
            reviews: counts[2][0]?.count ?? 0,
            tasks: counts[3][0]?.count ?? 0,
          },
        };
      })
    );

    return {
      companies: companiesWithRelations as CompanyWithRelationsForList[],
      totalCount,
      totalPages,
    };
  } catch (error) {
    console.error("Error fetching companies:", error);
    return {
      companies: [],
      totalCount: 0,
      totalPages: 0,
    };
  }
}

export const getFirstThreeDealAIScreenings = async (dealId: string) => {
  try {
    return await db
      .select()
      .from(aiScreenings)
      .where(eq(aiScreenings.dealId, dealId))
      .orderBy(desc(aiScreenings.createdAt))
      .limit(3);
  } catch (error) {
    console.error("Error fetching deal ai screenings", error);
    throw error;
  }
};

export const getDealDocuments = async (dealId: string) => {
  try {
    return await db
      .select()
      .from(dealDocuments)
      .where(eq(dealDocuments.dealId, dealId));
  } catch (error) {
    console.error("Error fetching deal documents", error);
    throw error;
  }
};
