import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import {
  getAllUserJobs,
  getJobByIdForUser,
  getLatestUserJobs,
  deleteUserJob,
  getJobStatus,
} from "@/src/lib/workflow-jobs-api";
import { after } from "@/lib/after";
import { revalidatePath } from "@/lib/cache-invalidation";

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
        queueName: z.enum([
          QUEUE_NAMES.SCREEN_DEAL,
          QUEUE_NAMES.FILE_UPLOAD,
          QUEUE_NAMES.CIM_EXTRACTION,
          QUEUE_NAMES.RAG_INGESTION,
          QUEUE_NAMES.SIM_SCREENING,
        ]),
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
        queueName: z.enum([
          QUEUE_NAMES.SCREEN_DEAL,
          QUEUE_NAMES.FILE_UPLOAD,
          QUEUE_NAMES.CIM_EXTRACTION,
          QUEUE_NAMES.RAG_INGESTION,
          QUEUE_NAMES.SIM_SCREENING,
        ]),
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
            queueName: z.enum([
              QUEUE_NAMES.SCREEN_DEAL,
              QUEUE_NAMES.FILE_UPLOAD,
              QUEUE_NAMES.CIM_EXTRACTION,
              QUEUE_NAMES.RAG_INGESTION,
              QUEUE_NAMES.SIM_SCREENING,
            ]),
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
});
