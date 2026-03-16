import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  QUEUE_NAMES,
  getAllUserJobs,
  getLatestUserJobs,
  getJobStatus,
  deleteUserJob,
} from "@repo/redis-queue";
import { revalidatePath } from "next/cache";

export const jobsRouter = createTRPCRouter({
  /**
   * Get all jobs for the current user
   * Returns jobs from all queues (screen-deal, file-upload)
   * Sorted by createdAt descending
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id as string;
    const jobs = await getAllUserJobs(userId);
    return jobs;
  }),

  /**
   * Get latest N jobs for the current user
   * Optimized for sidebar display
   */
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
      const jobs = await getLatestUserJobs(userId, limit);
      return jobs;
    }),

  /**
   * Get a single job by ID and queue name
   * Verifies the job belongs to the current user
   */
  getById: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        queueName: z.enum([
          QUEUE_NAMES.SCREEN_DEAL,
          QUEUE_NAMES.FILE_UPLOAD,
          QUEUE_NAMES.CIM_EXTRACTION,
          QUEUE_NAMES.RAG_INGESTION,
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const { jobId, queueName } = input;

      // Get job status
      const jobStatus = await getJobStatus(queueName, jobId);

      if (!jobStatus) {
        return null;
      }

      // Verify job belongs to user by checking all user jobs
      const userJobs = await getAllUserJobs(userId);
      const job = userJobs.find((j) => j.jobId === jobId);

      if (!job) {
        return null; // Job not found or doesn't belong to user
      }

      // Return job with current status
      return {
        ...job,
        state: jobStatus.state,
        progress: jobStatus.progress,
        returnvalue: jobStatus.returnvalue,
        failedReason: jobStatus.failedReason,
      };
    }),

  /**
   * Delete a job by ID and queue name
   * Verifies the job belongs to the current user before deleting
   */
  delete: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        queueName: z.enum([
          QUEUE_NAMES.SCREEN_DEAL,
          QUEUE_NAMES.FILE_UPLOAD,
          QUEUE_NAMES.CIM_EXTRACTION,
          QUEUE_NAMES.RAG_INGESTION,
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const { jobId, queueName } = input;

      await deleteUserJob(userId, jobId, queueName);

      // Revalidate the jobs page
      revalidatePath("/jobs");

      return { success: true };
    }),

  /**
   * Bulk delete multiple jobs
   * Verifies all jobs belong to the current user before deleting
   */
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
            ]),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id as string;
      const { jobs } = input;

      // Delete all jobs in parallel
      await Promise.all(
        jobs.map((job) => deleteUserJob(userId, job.jobId, job.queueName)),
      );

      // Revalidate the jobs page
      revalidatePath("/jobs");

      return { success: true, deletedCount: jobs.length };
    }),
});
