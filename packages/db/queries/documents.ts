import { documents } from "../schema";
import { db } from "../index";
import { eq, and, desc, count } from "drizzle-orm";

/**
 * Get documents attached to a theme
 */
export const GetThemeDocuments = async (themeId: string) => {
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.entityType, "THEME"), eq(documents.entityId, themeId)),
      );

    return docs;
  } catch (error) {
    console.error("Failed query: select documents for theme", error);
    throw error;
  }
};

/**
 * Get firm-level (global) documents
 */
export const GetGlobalDocuments = async () => {
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.entityType, "GLOBAL"))
      .orderBy(desc(documents.createdAt));

    return docs;
  } catch (error) {
    console.error("Failed query: select global documents", error);
    throw error;
  }
};

interface GetAllDocumentsResult {
  data: (typeof documents.$inferSelect)[];
  totalCount: number;
  totalPages: number;
}

/**
 * Get all documents across all entities with pagination
 */
export const GetAllDocuments = async ({
  offset = 0,
  limit = 50,
  entityType,
}: {
  offset?: number;
  limit?: number;
  entityType?: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY" | "THEME" | "GLOBAL";
}): Promise<GetAllDocumentsResult> => {
  try {
    const whereClause = entityType
      ? eq(documents.entityType, entityType)
      : undefined;

    const [data, countResult] = await Promise.all([
      whereClause
        ? db
          .select()
          .from(documents)
          .where(whereClause)
          .orderBy(desc(documents.createdAt))
          .limit(limit)
          .offset(offset)
        : db
          .select()
          .from(documents)
          .orderBy(desc(documents.createdAt))
          .limit(limit)
          .offset(offset),
      whereClause
        ? db.select({ count: count() }).from(documents).where(whereClause)
        : db.select({ count: count() }).from(documents),
    ]);

    const rawCount = countResult[0]?.count ?? 0;
    const totalCount = Number(rawCount);
    const totalPages = Math.ceil(totalCount / limit);

    return { data, totalCount, totalPages };
  } catch (error) {
    console.error("Failed query: select all documents", error);
    throw error;
  }
};

