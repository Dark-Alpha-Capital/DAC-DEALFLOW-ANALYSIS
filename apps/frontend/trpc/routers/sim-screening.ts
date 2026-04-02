import { z } from "zod";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents, dealOpportunities, eq } from "@repo/db";
import {
  deleteSimScreeningAnswersForRun,
  insertSimScreeningSession,
  insertSimScreeningRun,
  updateSimScreeningRun,
} from "@repo/db/mutations";
import { deleteWorkflowJobRow } from "@repo/db/workflow-jobs";
import {
  getSimScreeningSessionByIdForUser,
  listSimScreeningSessionsForUserWithMeta,
  getScreenerQuestions,
  getSimScreeningAnswersByRunId,
  getScreenerById,
  getSimScreeningRunsBySessionId,
  getSimScreeningRunByIdForUser,
  simScreeningSessionHasActiveRun,
  countDocumentChunksByDealOpportunityId,
  countDocumentChunksByDocumentId,
  listSimScreeningLibraryDocumentsForUser,
  getDocumentChunksByIds,
} from "@repo/db/queries";
import { mapEvidenceChunkIdsToCitations } from "@/lib/map-sim-screening-evidence";
import {
  insertWorkflowJob,
  startSimScreeningWorkflow,
  getJobByIdForUser,
  terminateWorkflowInstance,
} from "@/src/lib/workflow-jobs-api";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

const startSchema = z.object({
  documentId: z.string().min(1),
  screenerId: z.string().min(1),
});

const SCREENING_LIBRARY_CATEGORIES = ["CIM", "SIM_SCREENING"] as const;

export const simScreeningRouter = createTRPCRouter({
  listLibraryDocuments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    if (!userId?.trim()) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
    }
    return listSimScreeningLibraryDocumentsForUser(userId);
  }),

  start: protectedProcedure.input(startSchema).mutation(async ({ input, ctx }) => {
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

    const [docRow] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, input.documentId))
      .limit(1);

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
        message: "Document must be a CIM library upload or legacy SIM screening file",
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

    const session = await insertSimScreeningSession({
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
    const run = await insertSimScreeningRun({
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
      workflowKind: "sim-screening",
      userId,
      fileName: fileLabel,
      screenerId: input.screenerId,
    });

    await startSimScreeningWorkflow(jobId, {
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
      queueName: QUEUE_NAMES.SIM_SCREENING,
    };
  }),

  startRun: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        screenerId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
      }

      const session = await getSimScreeningSessionByIdForUser(
        input.sessionId,
        userId,
      );
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const dealOppId = session.dealOpportunityId?.trim();
      const simDocId = session.documentId?.trim();

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
      } else if (simDocId) {
        const [docRow] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, simDocId))
          .limit(1);

        if (!docRow || docRow.ingestionStatus !== "PROCESSED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Document must be fully ingested before screening with another template. Wait for the first run to finish or retry a failed run.",
          });
        }
        const docChunks = await countDocumentChunksByDocumentId(simDocId);
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

      if (await simScreeningSessionHasActiveRun(input.sessionId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Another screening run is already in progress for this session.",
        });
      }

      const jobId = randomUUID();
      const run = await insertSimScreeningRun({
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

      let fileLabel = "SIM.pdf";
      let workflowDealId: string | undefined;
      if (dealOppId) {
        const [oppRow] = await db
          .select({
            dealTeaser: dealOpportunities.dealTeaser,
          })
          .from(dealOpportunities)
          .where(eq(dealOpportunities.id, dealOppId))
          .limit(1);
        const teaser = oppRow?.dealTeaser?.trim();
        fileLabel =
          teaser && teaser.length > 120 ? `${teaser.slice(0, 120)}…` : teaser ?? "Deal opportunity";
        workflowDealId = dealOppId;
      } else {
        const [docRow] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, simDocId!))
          .limit(1);
        fileLabel = docRow?.fileName ?? docRow?.title ?? "SIM.pdf";
      }

      await insertWorkflowJob({
        instanceId: jobId,
        workflowKind: "sim-screening",
        userId,
        fileName: fileLabel,
        screenerId: input.screenerId,
        dealId: workflowDealId ?? null,
      });

      await startSimScreeningWorkflow(jobId, {
        jobId,
        userId,
        ...(dealOppId
          ? { dealOpportunityId: dealOppId }
          : { documentId: simDocId! }),
        screenerId: input.screenerId,
        sessionId: session.id,
        runId: run.id,
      });

      return {
        sessionId: session.id,
        runId: run.id,
        jobId,
        queueName: QUEUE_NAMES.SIM_SCREENING,
      };
    }),

  getSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        runId: z.string().min(1).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const session = await getSimScreeningSessionByIdForUser(
        input.sessionId,
        userId,
      );
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const runs = await getSimScreeningRunsBySessionId(session.id);

      let selectedRun = input.runId
        ? runs.find((r) => r.id === input.runId) ?? null
        : null;
      if (!selectedRun && runs.length > 0) {
        selectedRun =
          runs.find((r) => r.status !== "COMPLETED" && r.status !== "FAILED") ??
          runs[0] ??
          null;
      }

      const [documentRow, dealRow, questions, answers] = await Promise.all([
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
        selectedRun
          ? getScreenerQuestions(selectedRun.screenerId)
          : Promise.resolve([]),
        selectedRun
          ? getSimScreeningAnswersByRunId(selectedRun.id)
          : Promise.resolve([]),
      ]);

      const screener = selectedRun
        ? await getScreenerById(selectedRun.screenerId)
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

      let job: Awaited<ReturnType<typeof getJobByIdForUser>> = null;
      if (selectedRun?.workflowInstanceId) {
        job = await getJobByIdForUser(
          userId,
          QUEUE_NAMES.SIM_SCREENING,
          selectedRun.workflowInstanceId,
        );
      }

      return {
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
          ? { id: screener.id, name: screener.name, category: screener.category }
          : null,
        rows,
        job,
      };
    }),

  retry: protectedProcedure
    .input(z.object({ runId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      if (!userId?.trim()) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
      }

      const run = await getSimScreeningRunByIdForUser(input.runId, userId);
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

      const session = await getSimScreeningSessionByIdForUser(
        run.sessionId,
        userId,
      );
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const dealOppId = session.dealOpportunityId?.trim();
      const simDocId = session.documentId?.trim();

      let fileLabel = "SIM.pdf";
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
        const [oppRow] = await db
          .select({ dealTeaser: dealOpportunities.dealTeaser })
          .from(dealOpportunities)
          .where(eq(dealOpportunities.id, dealOppId))
          .limit(1);
        const teaser = oppRow?.dealTeaser?.trim();
        fileLabel =
          teaser && teaser.length > 120 ? `${teaser.slice(0, 120)}…` : teaser ?? "Deal opportunity";
        workflowPayload = { dealOpportunityId: dealOppId };
      } else if (simDocId) {
        const [docRow] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, simDocId))
          .limit(1);
        if (!docRow || docRow.ingestionStatus !== "PROCESSED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Document must be fully ingested before retry. Fix ingestion from Firm documents, then retry.",
          });
        }
        const chunks = await countDocumentChunksByDocumentId(simDocId);
        if (chunks === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "No chunks for this document. Re-ingest from Firm documents, then retry.",
          });
        }
        fileLabel = docRow.fileName ?? docRow.title ?? "SIM.pdf";
        workflowPayload = { documentId: simDocId };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session has no document or deal opportunity",
        });
      }

      const oldJobId = run.workflowInstanceId;
      if (oldJobId) {
        try {
          await terminateWorkflowInstance("sim-screening", oldJobId);
        } catch {
          // Instance may already be gone
        }
        await deleteWorkflowJobRow(oldJobId);
      }

      await deleteSimScreeningAnswersForRun(input.runId);

      const newJobId = randomUUID();

      await updateSimScreeningRun(input.runId, {
        status: "PENDING",
        errorMessage: null,
        workflowInstanceId: newJobId,
      });

      await insertWorkflowJob({
        instanceId: newJobId,
        workflowKind: "sim-screening",
        userId,
        fileName: fileLabel,
        screenerId: run.screenerId,
        dealId: dealOppId ?? null,
      });

      await startSimScreeningWorkflow(newJobId, {
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
        queueName: QUEUE_NAMES.SIM_SCREENING,
      };
    }),

  listSessions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 50;
      return listSimScreeningSessionsForUserWithMeta(userId, limit);
    }),
});
