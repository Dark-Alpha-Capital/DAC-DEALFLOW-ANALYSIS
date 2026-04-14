import { z } from "zod";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  startCimScreeningInputSchema,
  cimSessionRouteInputSchema,
  startCimScreeningRunInputSchema,
  retryCimScreeningRunInputSchema,
  listCimScreeningSessionsInputSchema,
} from "@/lib/zod-schemas/cim-screening-router";
import {
  deleteCimScreeningAnswersForRun,
  insertCimScreeningSession,
  insertCimScreeningRun,
  updateCimScreeningRun,
} from "@repo/db/mutations";
import { deleteWorkflowJobRow } from "@repo/db/workflow-jobs";
import {
  getCimScreeningSessionByIdForUser,
  listCimScreeningSessionsForUserWithMeta,
  getScreenerQuestions,
  getCimScreeningAnswersByRunId,
  getScreenerById,
  getCimScreeningRunsBySessionId,
  getCimScreeningRunByIdForUser,
  cimScreeningSessionHasActiveRun,
  countDocumentChunksByDealOpportunityId,
  countDocumentChunksByDocumentId,
  listCimScreeningLibraryDocumentsForUser,
  getDocumentChunksByIds,
  getLibraryDocumentByIdForCim,
  getDealOpportunityBriefForCim,
} from "@repo/db/queries";
import { mapEvidenceChunkIdsToCitations } from "@/lib/map-cim-screening-evidence";
import {
  insertWorkflowJob,
  startCimScreeningWorkflow,
  getJobByIdForUser,
  terminateWorkflowInstance,
} from "@/src/lib/workflow-jobs-api";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

const SCREENING_LIBRARY_CATEGORIES = ["CIM", "CIM_SCREENING"] as const;

function dealOpportunityHeadline(opp: {
  title: string | null;
  dealTeaser: string | null;
}): string {
  const t = opp.title?.trim() || opp.dealTeaser?.trim();
  if (!t) return "Deal opportunity";
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

/** Shared session + runs + selected run + parallel promises for document/deal/job. */
async function loadCimScreeningSessionBase(
  input: z.infer<typeof cimSessionRouteInputSchema>,
  userId: string,
) {
  const session = await getCimScreeningSessionByIdForUser(
    input.sessionId,
    userId,
  );
  if (!session) return null;

  const runs = await getCimScreeningRunsBySessionId(session.id);

  let selectedRun = input.runId
    ? runs.find((r) => r.id === input.runId) ?? null
    : null;
  if (!selectedRun && runs.length > 0) {
    selectedRun =
      runs.find((r) => r.status !== "COMPLETED" && r.status !== "FAILED") ??
      runs[0] ??
      null;
  }

  const documentPromise = session.documentId
    ? getLibraryDocumentByIdForCim(session.documentId)
    : Promise.resolve(null);
  const dealPromise = session.dealOpportunityId
    ? getDealOpportunityBriefForCim(session.dealOpportunityId)
    : Promise.resolve(null);
  const jobPromise =
    selectedRun?.workflowInstanceId
      ? getJobByIdForUser(
          userId,
          QUEUE_NAMES.CIM_SCREENING,
          selectedRun.workflowInstanceId,
        )
      : Promise.resolve(null);

  const mappedRuns = runs.map((r) => ({
    id: r.id,
    screenerId: r.screenerId,
    screenerName: r.screenerName,
    screenerCategory: r.screenerCategory,
    status: r.status,
    errorMessage: r.errorMessage,
    workflowInstanceId: r.workflowInstanceId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const run = selectedRun
    ? {
        id: selectedRun.id,
        status: selectedRun.status,
        errorMessage: selectedRun.errorMessage,
        workflowInstanceId: selectedRun.workflowInstanceId,
      }
    : null;

  const screener = selectedRun
    ? {
        id: selectedRun.screenerId,
        name: selectedRun.screenerName,
        category: selectedRun.screenerCategory,
      }
    : null;

  return {
    session,
    selectedRun,
    documentPromise,
    dealPromise,
    jobPromise,
    mappedRuns,
    selectedRunId: selectedRun?.id ?? null,
    run,
    screener,
  };
}

export const cimScreeningRouter = createTRPCRouter({
  listLibraryDocuments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    if (!userId?.trim()) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
    }
    return listCimScreeningLibraryDocumentsForUser(userId);
  }),

  start: protectedProcedure
    .input(startCimScreeningInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
      }

      const screener = await getScreenerById(input.screenerId);
      if (!screener) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Screener template not found",
        });
      }

      const docRow = await getLibraryDocumentByIdForCim(input.documentId);

      if (!docRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      if (docRow.entityType !== "GLOBAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only firm library documents can be used for CIM screening",
        });
      }

      if (docRow.uploadedById !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only screen documents you uploaded",
        });
      }

      if (
        !(SCREENING_LIBRARY_CATEGORIES as readonly string[]).includes(
          docRow.category,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Document must be a CIM library upload or CIM template screening file",
        });
      }

      if (docRow.ingestionStatus !== "PROCESSED") {
        const hint =
          docRow.ingestionStatus === "PENDING" ||
          docRow.ingestionStatus === "PROCESSING"
            ? "Wait for ingestion to finish (Firm documents), then try again."
            : docRow.ingestionStatus === "FAILED"
              ? docRow.ingestionError
                ? `Ingestion failed: ${docRow.ingestionError}`
                : "Ingestion failed; re-upload or retry from documents."
              : "This document was skipped during ingestion and cannot be screened.";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document is not ready for screening. ${hint}`,
        });
      }

      const chunkCount = await countDocumentChunksByDocumentId(docRow.id);
      if (chunkCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No ingested chunks for this document. Re-ingest from firm documents or contact support.",
        });
      }

      const session = await insertCimScreeningSession({
        userId,
        documentId: docRow.id,
      });

      if (!session) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening session",
        });
      }

      const jobId = randomUUID();
      const run = await insertCimScreeningRun({
        sessionId: session.id,
        screenerId: input.screenerId,
        workflowInstanceId: jobId,
      });

      if (!run) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening run",
        });
      }

      const fileLabel = docRow.fileName ?? docRow.title ?? "CIM.pdf";

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: "cim-screening",
        userId,
        fileName: fileLabel,
        screenerId: input.screenerId,
      });

      await startCimScreeningWorkflow(jobId, {
        jobId,
        userId,
        documentId: docRow.id,
        screenerId: input.screenerId,
        sessionId: session.id,
        runId: run.id,
      });

      return {
        sessionId: session.id,
        runId: run.id,
        documentId: docRow.id,
        jobLabel: fileLabel,
        jobId,
        queueName: QUEUE_NAMES.CIM_SCREENING,
      };
    }),

  startRun: protectedProcedure
    .input(startCimScreeningRunInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
      }

      const session = await getCimScreeningSessionByIdForUser(
        input.sessionId,
        userId,
      );
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const dealOppId = session.dealOpportunityId?.trim();
      const libraryDocId = session.documentId?.trim();

      if (dealOppId) {
        const chunkCount =
          await countDocumentChunksByDealOpportunityId(dealOppId);
        if (chunkCount === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No ingested document chunks for this deal. Upload files and wait for processing, then try again.",
          });
        }
      } else if (libraryDocId) {
        const docRow = await getLibraryDocumentByIdForCim(libraryDocId);

        if (!docRow || docRow.ingestionStatus !== "PROCESSED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Document must be fully ingested before screening with another template. Wait for the first run to finish or retry a failed run.",
          });
        }
        const docChunks = await countDocumentChunksByDocumentId(libraryDocId);
        if (docChunks === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No chunks for this document. Re-ingest from Firm documents, then try again.",
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session has no document or deal opportunity",
        });
      }

      const screener = await getScreenerById(input.screenerId);
      if (!screener) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Screener template not found",
        });
      }

      if (await cimScreeningSessionHasActiveRun(input.sessionId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Another screening run is already in progress for this session.",
        });
      }

      const jobId = randomUUID();
      const run = await insertCimScreeningRun({
        sessionId: session.id,
        screenerId: input.screenerId,
        workflowInstanceId: jobId,
      });

      if (!run) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create screening run",
        });
      }

      let fileLabel = "CIM.pdf";
      let workflowDealId: string | undefined;
      if (dealOppId) {
        const oppRow = await getDealOpportunityBriefForCim(dealOppId);
        fileLabel = oppRow
          ? dealOpportunityHeadline(oppRow)
          : "Deal opportunity";
        workflowDealId = dealOppId;
      } else {
        const docRow = await getLibraryDocumentByIdForCim(libraryDocId!);
        fileLabel = docRow?.fileName ?? docRow?.title ?? "CIM.pdf";
      }

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: "cim-screening",
        userId,
        fileName: fileLabel,
        screenerId: input.screenerId,
        dealId: workflowDealId ?? null,
      });

      await startCimScreeningWorkflow(jobId, {
        jobId,
        userId,
        ...(dealOppId
          ? { dealOpportunityId: dealOppId }
          : { documentId: libraryDocId! }),
        screenerId: input.screenerId,
        sessionId: session.id,
        runId: run.id,
      });

      return {
        sessionId: session.id,
        runId: run.id,
        jobId,
        queueName: QUEUE_NAMES.CIM_SCREENING,
      };
    }),

  getSessionStatus: protectedProcedure
    .input(cimSessionRouteInputSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const base = await loadCimScreeningSessionBase(input, userId);
      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      const [documentRow, dealRow, job] = await Promise.all([
        base.documentPromise,
        base.dealPromise,
        base.jobPromise,
      ]);

      return {
        session: base.session,
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
              title: dealRow.title,
              dealTeaser: dealRow.dealTeaser,
              description: dealRow.description,
            }
          : null,
        runs: base.mappedRuns,
        selectedRunId: base.selectedRunId,
        run: base.run,
        screener: base.screener,
        job,
      };
    }),

  getSession: protectedProcedure
    .input(cimSessionRouteInputSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const base = await loadCimScreeningSessionBase(input, userId);
      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const [documentRow, dealRow, questions, answers, job] = await Promise.all([
        base.documentPromise,
        base.dealPromise,
        base.selectedRun
          ? getScreenerQuestions(base.selectedRun.screenerId)
          : Promise.resolve([]),
        base.selectedRun
          ? getCimScreeningAnswersByRunId(base.selectedRun.id)
          : Promise.resolve([]),
        base.jobPromise,
      ]);

      const screenerRow = base.selectedRun
        ? await getScreenerById(base.selectedRun.screenerId)
        : null;

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
        session: base.session,
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
              title: dealRow.title,
              dealTeaser: dealRow.dealTeaser,
              description: dealRow.description,
            }
          : null,
        runs: base.mappedRuns,
        selectedRunId: base.selectedRunId,
        run: base.run,
        screener: screenerRow
          ? {
              id: screenerRow.id,
              name: screenerRow.name,
              category: screenerRow.category,
            }
          : null,
        rows,
        job,
      };
    }),

  retry: protectedProcedure
    .input(retryCimScreeningRunInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
      }

      const run = await getCimScreeningRunByIdForUser(input.runId, userId);
      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
      }

      if (
        run.status === "PENDING" ||
        run.status === "INGESTING" ||
        run.status === "SCREENING"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wait until this run finishes or fails before retrying.",
        });
      }

      if (run.status !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed runs can be retried.",
        });
      }

      const session = await getCimScreeningSessionByIdForUser(
        run.sessionId,
        userId,
      );
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const dealOppId = session.dealOpportunityId?.trim();
      const libraryDocId = session.documentId?.trim();

      let fileLabel = "CIM.pdf";
      let workflowPayload:
        | { dealOpportunityId: string }
        | { documentId: string };

      if (dealOppId) {
        const chunkCount =
          await countDocumentChunksByDealOpportunityId(dealOppId);
        if (chunkCount === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No ingested document chunks for this deal. Upload files and wait for processing, then try again.",
          });
        }
        const oppRow = await getDealOpportunityBriefForCim(dealOppId);
        fileLabel = oppRow
          ? dealOpportunityHeadline(oppRow)
          : "Deal opportunity";
        workflowPayload = { dealOpportunityId: dealOppId };
      } else if (libraryDocId) {
        const docRow = await getLibraryDocumentByIdForCim(libraryDocId);
        if (!docRow || docRow.ingestionStatus !== "PROCESSED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Document must be fully ingested before retry. Fix ingestion from Firm documents, then retry.",
          });
        }
        const chunks = await countDocumentChunksByDocumentId(libraryDocId);
        if (chunks === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No chunks for this document. Re-ingest from Firm documents, then retry.",
          });
        }
        fileLabel = docRow.fileName ?? docRow.title ?? "CIM.pdf";
        workflowPayload = { documentId: libraryDocId };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session has no document or deal opportunity",
        });
      }

      const oldJobId = run.workflowInstanceId;
      if (oldJobId) {
        try {
          await terminateWorkflowInstance("cim-screening", oldJobId);
        } catch {
          // Instance may already be gone
        }
        await deleteWorkflowJobRow(oldJobId);
      }

      await deleteCimScreeningAnswersForRun(input.runId);

      const newJobId = randomUUID();

      await updateCimScreeningRun(input.runId, {
        status: "PENDING",
        errorMessage: null,
        workflowInstanceId: newJobId,
      });

      await insertWorkflowJob({
        instanceId: newJobId,
        workflowKind: "cim-screening",
        userId,
        fileName: fileLabel,
        screenerId: run.screenerId,
        dealId: dealOppId ?? null,
      });

      await startCimScreeningWorkflow(newJobId, {
        jobId: newJobId,
        userId,
        screenerId: run.screenerId,
        sessionId: session.id,
        runId: run.id,
        ...workflowPayload,
      });

      return {
        sessionId: session.id,
        runId: run.id,
        jobId: newJobId,
        queueName: QUEUE_NAMES.CIM_SCREENING,
      };
    }),

  listSessions: protectedProcedure
    .input(listCimScreeningSessionsInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 50;
      return listCimScreeningSessionsForUserWithMeta(userId, limit);
    }),
});
