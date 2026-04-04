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
  getDocumentChunksByIds,
} from "@repo/db/queries";
import { mapEvidenceChunkIdsToCitations } from "@/lib/map-sim-screening-evidence";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { getJobByIdForUser } from "@/src/lib/workflow-jobs-api";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { cimScreeningSessionInputSchema } from "@/lib/server/server-fn-input-schemas";

export const loadCimScreeningIndexData = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await assertAuthenticated();
    const userId = session.user.id;
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
  .inputValidator((raw: unknown) => cimScreeningSessionInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const session = await assertAuthenticated();
    const userId = session.user.id;
    const screeningSession = await getSimScreeningSessionByIdForUser(
      data.sessionId,
      userId,
    );
    if (!screeningSession) {
      throw notFound();
    }

    const [runs, documentRow, dealRow, screeners] = await Promise.all([
      getSimScreeningRunsBySessionId(screeningSession.id),
      screeningSession.documentId
        ? db
            .select()
            .from(documents)
            .where(eq(documents.id, screeningSession.documentId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      screeningSession.dealOpportunityId
        ? db
            .select({
              id: dealOpportunities.id,
              dealTeaser: dealOpportunities.dealTeaser,
              description: dealOpportunities.description,
            })
            .from(dealOpportunities)
            .where(eq(dealOpportunities.id, screeningSession.dealOpportunityId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      getAllScreeners(),
    ]);

    let selectedRun = data.runId
      ? runs.find((r) => r.id === data.runId) ?? null
      : null;
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

    const allEvidenceIds = [
      ...new Set(
        answers.flatMap((a) => a.evidenceChunkIds ?? []).filter(Boolean),
      ),
    ];
    const evidenceChunkRows =
      allEvidenceIds.length > 0
        ? await getDocumentChunksByIds(allEvidenceIds)
        : [];

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
        evidenceCitations: mapEvidenceChunkIdsToCitations(
          ans?.evidenceChunkIds ?? null,
          evidenceChunkRows,
        ),
      };
    });

    return {
      screeners: screeners ?? [],
      sessionData: {
        session: screeningSession,
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
