import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import db, { companies, dealOpportunities, desc, documents, eq, isNull } from "@repo/db";
import {
  getAllScreeners,
  getScreenerById,
  getScreenerQuestions,
  getSimScreeningAnswersByRunId,
  getSimScreeningRunsBySessionId,
  getSimScreeningSessionByIdForUser,
  listSimScreeningSessionsForUserWithMeta,
  listSimScreeningLibraryDocumentsForUser,
  getDocumentChunksByIds,
} from "@repo/db/queries";
import { mapEvidenceChunkIdsToCitations } from "@/lib/map-sim-screening-evidence";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { getJobByIdForUser } from "@/src/lib/workflow-jobs-api";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  cimScreeningSessionInputSchema,
  cimScreeningSessionSyncInputSchema,
} from "@/lib/server/server-fn-input-schemas";
import { getBitrixSyncPreviewData } from "@/lib/server/bitrix-sync-preview-data";

function buildScreeningCommentForRun(input: {
  runId: string;
  sessionId: string;
  screenerName: string;
  runCreatedAt: Date;
  rows: Array<{ question: string; score: number | null; rationale: string | null }>;
}) {
  const headerLines = [
    "SIM Screening Sync",
    `Session ID: ${input.sessionId}`,
    `Run ID: ${input.runId}`,
    `Template: ${input.screenerName}`,
    `Run Created At: ${input.runCreatedAt.toISOString()}`,
    "",
  ];

  const qaLines = input.rows.flatMap((row, idx) => [
    `Q${idx + 1}: ${row.question}`,
    `Score: ${row.score ?? "N/A"}`,
    `Answer: ${row.rationale?.trim() || "N/A"}`,
    "",
  ]);

  return [...headerLines, ...qaLines].join("\n").trim();
}

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

export const loadCimScreeningNewRunData = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await assertAuthenticated();
  const userId = session.user.id;

  const [screeners, opportunities, libraryDocs] = await Promise.all([
    getAllScreeners(),
    db
      .select({
        id: dealOpportunities.id,
        companyId: dealOpportunities.companyId,
        leadId: dealOpportunities.leadId,
        dealTeaser: dealOpportunities.dealTeaser,
        stage: dealOpportunities.stage,
        status: dealOpportunities.status,
        companyName: companies.name,
        sourceWebsite: dealOpportunities.sourceWebsite,
      })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(isNull(companies.deletedAt))
      .orderBy(desc(dealOpportunities.updatedAt), desc(dealOpportunities.id))
      .limit(100),
    listSimScreeningLibraryDocumentsForUser(userId),
  ]);

  return {
    screeners: screeners ?? [],
    opportunities,
    libraryDocs,
  };
});

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

export const loadCimScreeningBitrixSyncData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => cimScreeningSessionSyncInputSchema.parse(raw))
  .handler(async ({ data }) => {
    if (!data.runId) {
      return {
        preview: null,
        dealOpportunityId: null,
        screeningComment: "",
        runSummary: null,
        error: "Select a run before syncing to Bitrix.",
      };
    }

    const session = await assertAuthenticated();
    const userId = session.user.id;

    const screeningSession = await getSimScreeningSessionByIdForUser(
      data.sessionId,
      userId,
    );
    if (!screeningSession || !screeningSession.dealOpportunityId) {
      return {
        preview: null,
        dealOpportunityId: null,
        screeningComment: "",
        runSummary: null,
        error: "This screening session is not linked to a deal opportunity.",
      };
    }

    const run = (
      await getSimScreeningRunsBySessionId(screeningSession.id)
    ).find((r) => r.id === data.runId);
    if (!run) {
      return {
        preview: null,
        dealOpportunityId: null,
        screeningComment: "",
        runSummary: null,
        error: "Run not found for this session.",
      };
    }
    if (run.status !== "COMPLETED") {
      return {
        preview: null,
        dealOpportunityId: null,
        screeningComment: "",
        runSummary: null,
        error: "Only completed runs can be synced to Bitrix.",
      };
    }

    const [questions, answers, previewResult] = await Promise.all([
      getScreenerQuestions(run.screenerId),
      getSimScreeningAnswersByRunId(run.id),
      getBitrixSyncPreviewData(screeningSession.dealOpportunityId),
    ]);

    if (!previewResult.success) {
      return {
        preview: null,
        dealOpportunityId: null,
        screeningComment: "",
        runSummary: null,
        error: previewResult.message,
      };
    }

    const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));
    const orderedRows = questions.map((q) => {
      const ans = answerByQuestionId.get(q.id);
      return {
        question: q.question,
        score: ans?.score ?? null,
        rationale: ans?.rationale ?? null,
      };
    });

    const screeningComment = buildScreeningCommentForRun({
      runId: run.id,
      sessionId: screeningSession.id,
      screenerName: run.screenerName,
      runCreatedAt: run.createdAt,
      rows: orderedRows,
    });

    return {
      preview: previewResult.data,
      dealOpportunityId: screeningSession.dealOpportunityId,
      screeningComment,
      runSummary: {
        runId: run.id,
        screenerName: run.screenerName,
        runCreatedAt: run.createdAt,
        questionCount: orderedRows.length,
      },
      error: null as string | null,
    };
  });
