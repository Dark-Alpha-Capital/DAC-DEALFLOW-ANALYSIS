import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import db, { documents, dealOpportunities, eq } from "@repo/db";
import {
  getAllScreeners,
  getScreenerById,
  getScreenerQuestions,
  getSimScreeningAnswersByRunId,
  getSimScreeningRunsBySessionId,
  getSimScreeningSessionByIdForUser,
  listSimScreeningSessionsForUserWithMeta,
} from "@repo/db/queries";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { getJobByIdForUser } from "@/src/lib/workflow-jobs-api";
import { fetchSession } from "./fetch-session-server-fn";

async function requireUserId() {
  const session = await fetchSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw notFound();
  }
  return userId;
}

export const loadCimScreeningIndexData = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = await requireUserId();
    const [screeners, recentSessions] = await Promise.all([
      getAllScreeners(),
      listSimScreeningSessionsForUserWithMeta(userId, 20),
    ]);

    return {
      screeners: screeners ?? [],
      recentSessions,
    };
  },
);

export const loadCimScreeningSessionData = createServerFn({ method: "GET" })
  .inputValidator(
    (raw: unknown) => raw as { sessionId: string; runId?: string | undefined },
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const session = await getSimScreeningSessionByIdForUser(data.sessionId, userId);
    if (!session) {
      throw notFound();
    }

    const [runs, documentRow, dealRow, screeners] = await Promise.all([
      getSimScreeningRunsBySessionId(session.id),
      session.documentId
        ? db
            .select()
            .from(documents)
            .where(eq(documents.id, session.documentId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      session.dealOpportunityId
        ? db
            .select({
              id: dealOpportunities.id,
              dealTeaser: dealOpportunities.dealTeaser,
              description: dealOpportunities.description,
            })
            .from(dealOpportunities)
            .where(eq(dealOpportunities.id, session.dealOpportunityId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      getAllScreeners(),
    ]);

    let selectedRun = data.runId ? runs.find((r) => r.id === data.runId) ?? null : null;
    if (!selectedRun && runs.length > 0) {
      selectedRun =
        runs.find((r) => r.status !== "COMPLETED" && r.status !== "FAILED") ??
        runs[0] ??
        null;
    }

    const [questions, answers, screener, job] = await Promise.all([
      selectedRun
        ? getScreenerQuestions(selectedRun.screenerId)
        : Promise.resolve([]),
      selectedRun
        ? getSimScreeningAnswersByRunId(selectedRun.id)
        : Promise.resolve([]),
      selectedRun ? getScreenerById(selectedRun.screenerId) : Promise.resolve(null),
      selectedRun?.workflowInstanceId
        ? getJobByIdForUser(
          userId,
          QUEUE_NAMES.SIM_SCREENING,
          selectedRun.workflowInstanceId,
        )
        : Promise.resolve(null),
    ]);

    const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

    const rows = questions.map((q) => {
      const ans = answerByQuestionId.get(q.id);
      return {
        questionId: q.id,
        question: q.question,
        position: q.position,
        weight: q.weight,
        score: ans?.score ?? null,
        rationale: ans?.rationale ?? null,
        evidenceChunkIds: ans?.evidenceChunkIds ?? null,
      };
    });

    return {
      screeners: screeners ?? [],
      sessionData: {
        session,
        document: documentRow
          ? {
            id: documentRow.id,
            title: documentRow.title,
            fileName: documentRow.fileName,
            fileSize: documentRow.fileSize,
            mimeType: documentRow.mimeType,
            ingestionStatus: documentRow.ingestionStatus,
            ingestionError: documentRow.ingestionError,
            ingestionCompletedAt: documentRow.ingestionCompletedAt,
            createdAt: documentRow.createdAt,
          }
          : null,
        dealOpportunity: dealRow
          ? {
            id: dealRow.id,
            dealTeaser: dealRow.dealTeaser,
            description: dealRow.description,
          }
          : null,
        runs: runs.map((r) => ({
          id: r.id,
          screenerId: r.screenerId,
          screenerName: r.screenerName,
          screenerCategory: r.screenerCategory,
          status: r.status,
          errorMessage: r.errorMessage,
          workflowInstanceId: r.workflowInstanceId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        selectedRunId: selectedRun?.id ?? null,
        run: selectedRun
          ? {
            id: selectedRun.id,
            status: selectedRun.status,
            errorMessage: selectedRun.errorMessage,
            workflowInstanceId: selectedRun.workflowInstanceId,
          }
          : null,
        screener: screener
          ? {
            id: screener.id,
            name: screener.name,
            category: screener.category,
          }
          : null,
        job: job
          ? {
            id: job.jobId,
            state: job.state,
            progress: job.progress ?? null,
            failedReason: job.failedReason ?? null,
          }
          : null,
        rows,
      },
    };
  });
