import db from ".";
import type { DealStatus, DealType } from "@prisma/client";
import type { Deal } from "@prisma/client";
import type { AdminUser, CompanyWithRelationsForList } from "./types";

/**
 * Get a deal by id
 * @param id - the id of the deal
 * @returns the deal
 */
export const GetDealById = async (id: string) => {
  try {
    return await db.deal.findUnique({
      where: { id },
    });
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
  const ebitdaValue = ebitda ? parseFloat(ebitda) : undefined;
  const revenueValue = revenue ? parseFloat(revenue) : undefined;
  const locationValue = location ? location : undefined;
  const maxRevenueValue = maxRevenue ? parseFloat(maxRevenue) : undefined;
  const maxEbitdaValue = maxEbitda ? parseFloat(maxEbitda) : undefined;
  const brokerageValue = brokerage ? brokerage : undefined;
  const industryValue = industry ? industry : undefined;
  const ebitdaMarginValue = ebitdaMargin ? parseFloat(ebitdaMargin) : undefined;

  const orderBy = showRecent
    ? { createdAt: "desc" as const }
    : { createdAt: "asc" as const };

  const whereClause = {
    ...(search ? { dealCaption: { contains: search } } : {}),
    ...(dealTypes && dealTypes.length > 0
      ? { dealType: { in: dealTypes } }
      : {}),
    ...(ebitdaValue !== undefined ? { ebitda: { gte: ebitdaValue } } : {}),
    ...(revenueValue !== undefined ? { revenue: { gte: revenueValue } } : {}),
    ...(maxEbitdaValue !== undefined
      ? { ebitda: { lte: maxEbitdaValue } }
      : {}),
    ...(maxRevenueValue !== undefined
      ? { revenue: { lte: maxRevenueValue } }
      : {}),
    ...(userId ? { userId: { equals: userId } } : {}),
    ...(locationValue !== undefined
      ? { companyLocation: { contains: locationValue } }
      : {}),
    ...(brokerageValue !== undefined
      ? { brokerage: { contains: brokerageValue } }
      : {}),
    ...(industryValue !== undefined
      ? { industry: { contains: industryValue } }
      : {}),
    ...(ebitdaMarginValue !== undefined
      ? { ebitdaMargin: { gte: ebitdaMarginValue } }
      : {}),
    ...(showSeen ? { seen: { equals: showSeen } } : {}),
    ...(showReviewed ? { isReviewed: { equals: showReviewed } } : {}),
    ...(showPublished ? { isPublished: { equals: showPublished } } : {}),
    ...(status ? { status: { equals: status } } : {}),
    ...(tags && tags.length > 0 ? { tags: { hasSome: tags } } : {}),
  };

  const [data, totalCount] = await Promise.all([
    db.deal.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy,
    }),
    db.deal.count({
      where: whereClause,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return { data, totalCount, totalPages };
};

/**
 * Get a user by their id
 * @param id - the id of the user
 * @returns the user
 */
export const getUserById = async (id: string) => {
  try {
    return await db.user.findUnique({
      where: {
        id,
      },
    });
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
    return await db.pOC.findMany({
      where: { dealId },
    });
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
    return await db.screener.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
    return await db.screener.findMany({
      select: {
        id: true,
        name: true,
      },
    });
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
    return await db.aiScreening.findMany({
      where: {
        dealId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        sentiment: true,
        score: true,
        explanation: true,
        createdAt: true,
        updatedAt: true,
        screener: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
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
    return await db.aiScreening.findUnique({
      where: {
        id: reasoningId,
      },
      select: {
        id: true,
        title: true,
        sentiment: true,
        score: true,
        content: true,
        explanation: true,
        createdAt: true,
        updatedAt: true,
        screener: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
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
    return await db.rollup.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        deals: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
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
    return await db.rollup.findUnique({
      where: {
        id: rollupId,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        deals: true,
      },
    });
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
    return await db.company.findUnique({
      where: { id },
      include: {
        founders: true,
        files: {
          orderBy: { createdAt: "desc" },
        },
        sections: {
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          include: {
            reviewer: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          include: {
            assignedTo: {
              select: { name: true, email: true },
            },
            createdBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            files: true,
            sections: true,
            reviews: true,
            tasks: true,
          },
        },
      },
    });
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
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => ({
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
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sector: { contains: search, mode: "insensitive" as const } },
            {
              headquarters: { contains: search, mode: "insensitive" as const },
            },
          ],
        }
      : {};

    const [companies, totalCount] = await Promise.all([
      db.company.findMany({
        where: whereClause,
        include: {
          founders: true,
          files: {
            take: 3,
            orderBy: { createdAt: "desc" },
          },
          sections: {
            take: 3,
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              files: true,
              sections: true,
              reviews: true,
              tasks: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.company.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      companies,
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
    return await db.aiScreening.findMany({
      where: { dealId },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    });
  } catch (error) {
    console.error("Error fetching deal ai screenings", error);
    throw error;
  }
};

export const getDealDocuments = async (dealId: string) => {
  try {
    return await db.dealDocument.findMany({
      where: { dealId },
    });
  } catch (error) {
    console.error("Error fetching deal documents", error);
    throw error;
  }
};
