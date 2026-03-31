import { z } from "zod";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import db, { documents, eq } from "@repo/db";
import { uploadBuffer, sanitizeFilename } from "@repo/nextcloud";
import {
  deleteSimScreeningAnswersForSession,
  insertSimScreeningSession,
  updateSimScreeningSession,
} from "@repo/db/mutations";
import { deleteWorkflowJobRow } from "@repo/db/workflow-jobs";
import {
  getSimScreeningSessionByIdForUser,
  listSimScreeningSessionsForUserWithScreener,
  getScreenerQuestions,
  getSimScreeningAnswersBySessionId,
  getScreenerById,
} from "@repo/db/queries";
import {
  insertWorkflowJob,
  startSimScreeningWorkflow,
  getJobByIdForUser,
  terminateWorkflowInstance,
} from "@/src/lib/workflow-jobs-api";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

const startSchema = z.object({
  fileName: z.string().min(1),
  fileData: z.string(),
  screenerId: z.string().min(1),
});

export const simScreeningRouter = createTRPCRouter({
  start: protectedProcedure.input(startSchema).mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;
    if (!userId?.trim()) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID required" });
    }

    if (!input.fileName.toLowerCase().endsWith(".pdf")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "SIM must be a PDF file",
      });
    }

    const screener = await getScreenerById(input.screenerId);
    if (!screener) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Screener template not found",
      });
    }

    const base64Data = input.fileData.split(",")[1] || input.fileData;
    const buffer = Buffer.from(base64Data, "base64");
    const safeName = sanitizeFilename(input.fileName) || "sim.pdf";
    const finalPath = `dealflow/sim_screening/${userId}/${randomUUID()}-${safeName}`;
    const fileUrl = await uploadBuffer(buffer, finalPath);

    const [documentRecord] = await db
      .insert(documents)
      .values({
        entityType: "GLOBAL",
        entityId: null,
        title: input.fileName,
        description: "SIM screening upload",
        category: "SIM_SCREENING",
        fileUrl,
        fileName: input.fileName,
        fileSize: buffer.length,
        mimeType: "application/pdf",
        uploadedById: userId,
      })
      .returning();

    if (!documentRecord) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save document",
      });
    }

    const jobId = randomUUID();
    const session = await insertSimScreeningSession({
      userId,
      documentId: documentRecord.id,
      screenerId: input.screenerId,
      workflowInstanceId: jobId,
    });

    if (!session) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create screening session",
      });
    }

    await insertWorkflowJob({
      instanceId: jobId,
      workflowKind: "sim-screening",
      userId,
      fileName: input.fileName,
      screenerId: input.screenerId,
    });

    await startSimScreeningWorkflow(jobId, {
      jobId,
      userId,
      documentId: documentRecord.id,
      screenerId: input.screenerId,
      sessionId: session.id,
    });

    return {
      sessionId: session.id,
      documentId: documentRecord.id,
      jobId,
      queueName: QUEUE_NAMES.SIM_SCREENING,
    };
  }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const session = await getSimScreeningSessionByIdForUser(
        input.sessionId,
        userId,
      );
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const [documentRow, screener, questions, answers] = await Promise.all([
        db
          .select()
          .from(documents)
          .where(eq(documents.id, session.documentId))
          .limit(1)
          .then((r) => r[0] ?? null),
        getScreenerById(session.screenerId),
        getScreenerQuestions(session.screenerId),
        getSimScreeningAnswersBySessionId(session.id),
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

      let job: Awaited<ReturnType<typeof getJobByIdForUser>> = null;
      if (session.workflowInstanceId) {
        job = await getJobByIdForUser(
          userId,
          QUEUE_NAMES.SIM_SCREENING,
          session.workflowInstanceId,
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
        screener: screener
          ? { id: screener.id, name: screener.name, category: screener.category }
          : null,
        rows,
        job,
      };
    }),

  retry: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
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

      if (
        session.status === "PENDING" ||
        session.status === "INGESTING" ||
        session.status === "SCREENING"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Wait until this run finishes or fails before retrying.",
        });
      }

      if (session.status !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed sessions can be retried.",
        });
      }

      const oldJobId = session.workflowInstanceId;
      if (oldJobId) {
        try {
          await terminateWorkflowInstance("sim-screening", oldJobId);
        } catch {
          // Instance may already be gone
        }
        await deleteWorkflowJobRow(oldJobId);
      }

      await deleteSimScreeningAnswersForSession(input.sessionId);

      const newJobId = randomUUID();

      await updateSimScreeningSession(input.sessionId, {
        status: "PENDING",
        errorMessage: null,
        workflowInstanceId: newJobId,
      });

      const [docRow] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, session.documentId))
        .limit(1);

      const fileLabel = docRow?.fileName ?? docRow?.title ?? "SIM.pdf";

      await insertWorkflowJob({
        instanceId: newJobId,
        workflowKind: "sim-screening",
        userId,
        fileName: fileLabel,
        screenerId: session.screenerId,
      });

      await startSimScreeningWorkflow(newJobId, {
        jobId: newJobId,
        userId,
        documentId: session.documentId,
        screenerId: session.screenerId,
        sessionId: session.id,
      });

      return {
        sessionId: session.id,
        jobId: newJobId,
        queueName: QUEUE_NAMES.SIM_SCREENING,
      };
    }),

  listSessions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 50;
      return listSimScreeningSessionsForUserWithScreener(userId, limit);
    }),
});
