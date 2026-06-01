import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import {
  getAllUserJobs,
  getJobByIdForUser,
  getLatestUserJobs,
  deleteUserJob,
  getJobStatus,
  restartWorkflowInstance,
} from "@/src/lib/workflow-jobs-api";
import { getWorkflowJobRow } from "@repo/db/workflow-jobs";
import { resetWorkflowJobRowAfterRestart } from "@repo/db/mutations";
import type { WorkflowKind } from "@repo/db/workflow-jobs";
import { after } from "@/lib/after";
import { revalidatePath } from "@/lib/cache-invalidation";

const queueNameSchema = z.enum([
  QUEUE_NAMES.SCREEN_DEAL,
  QUEUE_NAMES.FILE_UPLOAD,
  QUEUE_NAMES.CIM_EXTRACTION,
  QUEUE_NAMES.RAG_INGESTION,
  QUEUE_NAMES.CIM_SCREENING,
  QUEUE_NAMES.CIM_MONOGRAPH_SCREENING,
  QUEUE_NAMES.IC_SCORER_SCORE,
  QUEUE_NAMES.PROJECT_KICKOFF_SCREEN,
]);

async function assertJobOwnedAndFailed(
  userId: string,
  jobId: string,
  queueName: string,
) {
  const row = await getWorkflowJobRow(jobId);
  if (!row || row.userId !== userId || row.workflowKind !== queueName) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Job not found",
    });
  }
  if (row.state !== "failed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only failed jobs can be restarted",
    });
  }
}

export const jobsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id as string;
    return getAllUserJobs(userId);
  }),

  getLatest: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(10).default(5),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const limit = input?.limit ?? 5;
      return getLatestUserJobs(userId, limit);
    }),

  getById: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        queueName: queueNameSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const { jobId, queueName } = input;

      const [job, jobStatus] = await Promise.all([
        getJobByIdForUser(userId, queueName, jobId),
        getJobStatus(queueName, jobId),
      ]);

      if (!job || !jobStatus) {
        return null;
      }

      return {
        ...job,
        state: jobStatus.state,
        progress: jobStatus.progress ?? null,
        returnvalue: jobStatus.returnvalue,
        failedReason: jobStatus.failedReason ?? null,
      };
    }),

  delete: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        queueName: queueNameSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const { jobId, queueName } = input;

      await deleteUserJob(userId, jobId, queueName);

      after(async () => {
        revalidatePath("/jobs");
      });
      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        jobs: z.array(
          z.object({
            jobId: z.string(),
            queueName: queueNameSchema,
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const { jobs } = input;

      await Promise.all(
        jobs.map((job) => deleteUserJob(userId, job.jobId, job.queueName)),
      );

      after(async () => {
        revalidatePath("/jobs");
      });
      return { success: true, deletedCount: jobs.length };
    }),

  /**
   * Cloudflare Workflows `restart()` re-runs the entire workflow from the beginning
   * with the same instance id and original payload. Step-level “resume from failure”
   * is not exposed on the Worker binding.
   */
  restart: protectedProcedure
    .input(
      z.object({
        jobId: z.string().min(1),
        queueName: queueNameSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      await assertJobOwnedAndFailed(userId, input.jobId, input.queueName);
      try {
        await restartWorkflowInstance(
          input.queueName as WorkflowKind,
          input.jobId,
        );
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            e instanceof Error ? e.message : "Failed to restart workflow",
        });
      }
      await resetWorkflowJobRowAfterRestart(input.jobId);
      after(async () => {
        revalidatePath("/jobs");
      });
      return { success: true };
    }),

  bulkRestart: protectedProcedure
    .input(
      z.object({
        jobs: z.array(
          z.object({
            jobId: z.string().min(1),
            queueName: queueNameSchema,
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      for (const job of input.jobs) {
        await assertJobOwnedAndFailed(userId, job.jobId, job.queueName);
        try {
          await restartWorkflowInstance(
            job.queueName as WorkflowKind,
            job.jobId,
          );
        } catch (e) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              e instanceof Error
                ? `${job.jobId}: ${e.message}`
                : "Failed to restart workflow",
          });
        }
        await resetWorkflowJobRowAfterRestart(job.jobId);
      }
      after(async () => {
        revalidatePath("/jobs");
      });
      return { success: true, restartedCount: input.jobs.length };
    }),
});
