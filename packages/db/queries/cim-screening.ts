import {
  cimScreeningSessions,
  cimScreeningRuns,
  cimScreeningAnswers,
  documentChunks,
  documents,
  dealOpportunities,
  screeners,
} from "../schema";
import { db } from "../index";
import { eq, and, desc, inArray, count } from "drizzle-orm";

export async function getCimScreeningSessionByIdForUser(
  sessionId: string,
  userId: string,
) {
  const [row] = await db
    .select()
    .from(cimScreeningSessions)
    .where(
      and(
        eq(cimScreeningSessions.id, sessionId),
        eq(cimScreeningSessions.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listCimScreeningSessionsForUser(
  userId: string,
  limit = 50,
) {
  return db
    .select()
    .from(cimScreeningSessions)
    .where(eq(cimScreeningSessions.userId, userId))
    .orderBy(desc(cimScreeningSessions.createdAt))
    .limit(limit);
}

export async function getCimScreeningAnswersByRunId(runId: string) {
  return db
    .select()
    .from(cimScreeningAnswers)
    .where(eq(cimScreeningAnswers.runId, runId));
}

/** Load chunk excerpts for CIM template screening evidence IDs (RAG citations). */
export async function getDocumentChunksByIds(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => id?.trim()))];
  if (unique.length === 0) return [];
  return db
    .select({
      id: documentChunks.id,
      chunkText: documentChunks.chunkText,
      pageNumber: documentChunks.pageNumber,
    })
    .from(documentChunks)
    .where(inArray(documentChunks.id, unique));
}

export async function getCimScreeningRunsBySessionId(sessionId: string) {
  return db
    .select({
      id: cimScreeningRuns.id,
      sessionId: cimScreeningRuns.sessionId,
      screenerId: cimScreeningRuns.screenerId,
      workflowInstanceId: cimScreeningRuns.workflowInstanceId,
      status: cimScreeningRuns.status,
      errorMessage: cimScreeningRuns.errorMessage,
      createdAt: cimScreeningRuns.createdAt,
      updatedAt: cimScreeningRuns.updatedAt,
      screenerName: screeners.name,
      screenerCategory: screeners.category,
    })
    .from(cimScreeningRuns)
    .innerJoin(screeners, eq(cimScreeningRuns.screenerId, screeners.id))
    .where(eq(cimScreeningRuns.sessionId, sessionId))
    .orderBy(desc(cimScreeningRuns.createdAt));
}

/** All CIM template screening runs for sessions scoped to this deal opportunity. */
export async function listCimScreeningRunsForDealOpportunity(
  dealOpportunityId: string,
) {
  return db
    .select({
      runId: cimScreeningRuns.id,
      sessionId: cimScreeningSessions.id,
      status: cimScreeningRuns.status,
      errorMessage: cimScreeningRuns.errorMessage,
      workflowInstanceId: cimScreeningRuns.workflowInstanceId,
      screenerId: cimScreeningRuns.screenerId,
      screenerName: screeners.name,
      screenerCategory: screeners.category,
      runCreatedAt: cimScreeningRuns.createdAt,
      sessionCreatedAt: cimScreeningSessions.createdAt,
    })
    .from(cimScreeningRuns)
    .innerJoin(
      cimScreeningSessions,
      eq(cimScreeningRuns.sessionId, cimScreeningSessions.id),
    )
    .innerJoin(screeners, eq(cimScreeningRuns.screenerId, screeners.id))
    .where(eq(cimScreeningSessions.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(cimScreeningRuns.createdAt));
}

export type CimScreeningRunForDealRow = Awaited<
  ReturnType<typeof listCimScreeningRunsForDealOpportunity>
>[number];

export async function getCimScreeningRunByIdForUser(
  runId: string,
  userId: string,
) {
  const [row] = await db
    .select({ run: cimScreeningRuns })
    .from(cimScreeningRuns)
    .innerJoin(
      cimScreeningSessions,
      eq(cimScreeningRuns.sessionId, cimScreeningSessions.id),
    )
    .where(
      and(
        eq(cimScreeningRuns.id, runId),
        eq(cimScreeningSessions.userId, userId),
      ),
    )
    .limit(1);
  return row?.run ?? null;
}

/** True if this session has any run still in flight */
export async function countDocumentChunksByDealOpportunityId(
  dealOpportunityId: string,
) {
  const [row] = await db
    .select({ n: count() })
    .from(documentChunks)
    .where(eq(documentChunks.dealOpportunityId, dealOpportunityId));
  return Number(row?.n ?? 0);
}

export async function countDocumentChunksByDocumentId(documentId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));
  return Number(row?.n ?? 0);
}

/** Global CIM / template screening uploads owned by the user (for picker + screening). */
export async function listCimScreeningLibraryDocumentsForUser(userId: string) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      ingestionStatus: documents.ingestionStatus,
      ingestionError: documents.ingestionError,
      createdAt: documents.createdAt,
      category: documents.category,
    })
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "GLOBAL"),
        eq(documents.uploadedById, userId),
        inArray(documents.category, ["CIM", "CIM_SCREENING"]),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function cimScreeningSessionHasActiveRun(sessionId: string) {
  const row = await db
    .select({ id: cimScreeningRuns.id })
    .from(cimScreeningRuns)
    .where(
      and(
        eq(cimScreeningRuns.sessionId, sessionId),
        inArray(cimScreeningRuns.status, [
          "PENDING",
          "INGESTING",
          "SCREENING",
        ]),
      ),
    )
    .limit(1);
  return row.length > 0;
}

export async function listCimScreeningSessionsForUserWithMeta(
  userId: string,
  limit = 50,
) {
  const rows = await db
    .select({
      id: cimScreeningSessions.id,
      createdAt: cimScreeningSessions.createdAt,
      documentId: cimScreeningSessions.documentId,
      dealOpportunityId: cimScreeningSessions.dealOpportunityId,
      docFileName: documents.fileName,
      docTitle: documents.title,
      dealTitle: dealOpportunities.title,
      dealTeaser: dealOpportunities.dealTeaser,
      dealDescription: dealOpportunities.description,
    })
    .from(cimScreeningSessions)
    .leftJoin(documents, eq(cimScreeningSessions.documentId, documents.id))
    .leftJoin(
      dealOpportunities,
      eq(cimScreeningSessions.dealOpportunityId, dealOpportunities.id),
    )
    .where(eq(cimScreeningSessions.userId, userId))
    .orderBy(desc(cimScreeningSessions.createdAt))
    .limit(limit);

  const base = rows.map((s) => {
    const teaser = s.dealTeaser?.trim();
    const headline = s.dealTitle?.trim() || teaser || null;
    const fileName =
      s.docFileName ??
      (headline
        ? headline.length > 120
          ? `${headline.slice(0, 120)}…`
          : headline
        : "Deal opportunity");
    const title = s.docTitle ?? s.dealDescription ?? "";
    return {
      id: s.id,
      createdAt: s.createdAt,
      documentId: s.documentId,
      dealOpportunityId: s.dealOpportunityId,
      fileName,
      title,
    };
  });

  if (base.length === 0) return [];

  const sessionIds = base.map((b) => b.id);
  const allRuns = await db
    .select({
      sessionId: cimScreeningRuns.sessionId,
      status: cimScreeningRuns.status,
      screenerName: screeners.name,
      createdAt: cimScreeningRuns.createdAt,
    })
    .from(cimScreeningRuns)
    .innerJoin(screeners, eq(cimScreeningRuns.screenerId, screeners.id))
    .where(inArray(cimScreeningRuns.sessionId, sessionIds))
    .orderBy(desc(cimScreeningRuns.createdAt));

  const runCountBySession = new Map<string, number>();
  const latestBySession = new Map<string, (typeof allRuns)[number]>();
  for (const r of allRuns) {
    runCountBySession.set(
      r.sessionId,
      (runCountBySession.get(r.sessionId) ?? 0) + 1,
    );
    if (!latestBySession.has(r.sessionId)) {
      latestBySession.set(r.sessionId, r);
    }
  }

  return base.map((s) => {
    const latest = latestBySession.get(s.id);
    return {
      ...s,
      runCount: runCountBySession.get(s.id) ?? 0,
      latestRunStatus: latest?.status ?? null,
      latestScreenerName: latest?.screenerName ?? null,
      latestRunAt: latest?.createdAt ?? null,
    };
  });
}
