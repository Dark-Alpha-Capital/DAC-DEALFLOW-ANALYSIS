import { documents, workflowJobs } from "../schema";
import { db } from "../index";
import { eq, and, desc, count, inArray } from "drizzle-orm";

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

/** Documents uploaded for a deal opportunity (widget + app uploads). */
export async function listDealOpportunityDocumentsSummary(
  dealOpportunityId: string,
) {
  return db
    .select({
      id: documents.id,
      fileName: documents.fileName,
      contentHash: documents.contentHash,
      ingestionStatus: documents.ingestionStatus,
      ingestionError: documents.ingestionError,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(documents.createdAt));
}

/** File-upload + RAG jobs still running for a deal (no Document row until file-upload save-db completes). */
export async function listActiveIngestionPipelineJobsForDeal(
  dealOpportunityId: string,
) {
  return db
    .select({
      instanceId: workflowJobs.instanceId,
      workflowKind: workflowJobs.workflowKind,
      fileName: workflowJobs.fileName,
      state: workflowJobs.state,
      progressStep: workflowJobs.progressStep,
      progressPercent: workflowJobs.progressPercent,
      updatedAt: workflowJobs.updatedAt,
    })
    .from(workflowJobs)
    .where(
      and(
        eq(workflowJobs.dealId, dealOpportunityId),
        inArray(workflowJobs.workflowKind, ["file-upload", "rag-ingestion"]),
        inArray(workflowJobs.state, ["waiting", "active", "delayed"]),
      ),
    )
    .orderBy(desc(workflowJobs.updatedAt));
}

