"use server";

import prismaDB from "@/lib/prisma";

interface GetCompaniesResult {
  companies: any[];
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
      prismaDB.company.findMany({
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
      prismaDB.company.count({ where: whereClause }),
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
