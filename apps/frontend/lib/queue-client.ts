import { Queue } from "bullmq";
import IORedis from "ioredis";
import type {
  JobStatus,
  JobType,
  JobProgressData,
  JobWithMetadata,
} from "./queue-types";
import { QUEUE_NAMES } from "./queue-types";

const redisUrl = process.env.REDIS_URL as string;
const redisUrlToUse = redisUrl ?? "redis://127.0.0.1:6379";

// BullMQ requires ioredis (not node-redis)
// maxRetriesPerRequest: null is required for BullMQ
const connection = new IORedis(redisUrlToUse, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false, // Disable ready check - Redis user may not have INFO permission
});

connection.on("error", (err) => {
  console.error("BullMQ Redis connection error:", err);
});

// Queue names are imported from queue-types.ts

// Screen deal queue - for AI screening jobs
export const screenDealQueue = new Queue(QUEUE_NAMES.SCREEN_DEAL, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

// File upload queue - for file processing jobs
export const fileUploadQueue = new Queue(QUEUE_NAMES.FILE_UPLOAD, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

// Deal-to-company conversion queue
export const dealToCompanyQueue = new Queue(QUEUE_NAMES.DEAL_TO_COMPANY, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // Longer delay for conversion jobs
    },
  },
});

// Job data types
export interface ScreenDealJobData {
  jobId: string;
  dealId: string;
  screenerId: string;
  userId: string;
}

export interface CompanyMetadata {
  name: string;
  sector: string | null;
  stage: string | null;
  headquarters: string | null;
  revenue: number | null;
  ebitda: number | null;
}

// EntityMetadata is the same as CompanyMetadata but used for polymorphic entity support
export type EntityMetadata = CompanyMetadata;

export interface FileUploadJobData {
  jobId: string;
  fileName: string;
  filePath: string; // Path to final file in Nextcloud (uploaded directly, no temp step)
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type of the file
  userId: string; // Required - user who uploaded the file
  // Entity context (polymorphic - supports both deals and companies)
  entityType: "DEAL" | "COMPANY";
  entityId: string; // References deals.id or companies.id
  entityMetadata: EntityMetadata;
  // Vector store embedding control
  embedInVectorStore?: boolean; // Default: true for companies, false for deals (but can be overridden)
  // Optional file metadata
  fileCategory?: string;
  fileDescription?: string;
  // Step state - persisted via job.updateData() for resume on retry
  step?: string;
  // Intermediate results cached for resume
  validateResult?: {
    isValid: boolean;
    fileSize: number;
    mimeType: string;
  };
  nextcloudResult?: {
    destPath: string;
    publicUrl: string;
  };
  googleFileSearchResult?: {
    documentName: string | null;
  };
}

export interface ConvertDealToCompanyJobData {
  jobId: string;
  dealId: string;
  userId: string;
  // Step state - persisted via job.updateData() for resume on retry
  step?: string;
  // Intermediate results cached for resume
  companyResult?: {
    companyId: string;
  };
  documentsUpdated?: number;
  pocsMigrated?: number;
  filesMoved?: number;
}

// Re-export types and constants from queue-types for backward compatibility
// Client components should import from queue-types.ts directly to avoid pulling in BullMQ
export type {
  JobStatus,
  JobType,
  JobProgressData,
  JobWithMetadata,
} from "./queue-types";

// Re-export QUEUE_NAMES for convenience
export { QUEUE_NAMES } from "./queue-types";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the status of a job including progress and result
 */
export async function getJobStatus(queueName: string, jobId: string) {
  let queue: Queue;
  if (queueName === QUEUE_NAMES.SCREEN_DEAL) {
    queue = screenDealQueue;
  } else if (queueName === QUEUE_NAMES.FILE_UPLOAD) {
    queue = fileUploadQueue;
  } else if (queueName === QUEUE_NAMES.DEAL_TO_COMPANY) {
    queue = dealToCompanyQueue;
  } else {
    throw new Error(`Unknown queue name: ${queueName}`);
  }

  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress as JobProgressData | undefined;

  return {
    jobId,
    state,
    progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
  };
}

/**
 * Creates a screen deal job.
 * The job uses the "Process Step Jobs" pattern for idempotent processing.
 * If the job fails, it will resume from the last completed step on retry.
 */
export async function createScreenDealJob(data: ScreenDealJobData) {
  const job = await screenDealQueue.add("screen", data, {
    jobId: data.jobId, // Use provided jobId for deduplication
  });

  return {
    jobId: job.id,
    queueName: QUEUE_NAMES.SCREEN_DEAL,
  };
}

/**
 * Creates a file upload job.
 * The job uses the "Process Step Jobs" pattern for idempotent processing.
 * If the job fails, it will resume from the last completed step on retry.
 */
export async function createFileUploadJob(data: FileUploadJobData) {
  const job = await fileUploadQueue.add("upload", data, {
    jobId: data.jobId, // Use provided jobId for deduplication
  });

  return {
    jobId: job.id,
    queueName: QUEUE_NAMES.FILE_UPLOAD,
  };
}

/**
 * Creates a deal-to-company conversion job.
 * The job uses the "Process Step Jobs" pattern for idempotent processing.
 * If the job fails, it will resume from the last completed step on retry.
 */
export async function createConvertDealToCompanyJob(
  data: ConvertDealToCompanyJobData,
) {
  const job = await dealToCompanyQueue.add("convert", data, {
    jobId: data.jobId, // Use provided jobId for deduplication
  });

  return {
    jobId: job.id,
    queueName: QUEUE_NAMES.DEAL_TO_COMPANY,
  };
}

// ============================================================================
// Job Query Helpers
// ============================================================================

/**
 * Get all jobs for a specific user across all queues
 * Uses efficient batch fetching with Queue.getJobs()
 */
export async function getAllUserJobs(
  userId: string,
): Promise<JobWithMetadata[]> {
  const jobStates: JobStatus[] = [
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  ];

  // Fetch jobs from all queues in parallel
  const [screenDealJobs, fileUploadJobs, dealToCompanyJobs] = await Promise.all(
    [
      screenDealQueue.getJobs(jobStates, 0, 1000),
      fileUploadQueue.getJobs(jobStates, 0, 1000),
      dealToCompanyQueue.getJobs(jobStates, 0, 1000),
    ],
  );

  // Combine and filter by userId
  const allJobs = [
    ...screenDealJobs.map((job) => ({
      job,
      queueName: QUEUE_NAMES.SCREEN_DEAL,
    })),
    ...fileUploadJobs.map((job) => ({
      job,
      queueName: QUEUE_NAMES.FILE_UPLOAD,
    })),
    ...dealToCompanyJobs.map((job) => ({
      job,
      queueName: QUEUE_NAMES.DEAL_TO_COMPANY,
    })),
  ];

  // Filter by userId and transform to JobWithMetadata
  const userJobs: JobWithMetadata[] = [];

  for (const { job, queueName } of allJobs) {
    const jobData = job.data as
      | ScreenDealJobData
      | FileUploadJobData
      | ConvertDealToCompanyJobData;

    if (jobData.userId === userId) {
      const state = (await job.getState()) as JobStatus;
      const progress = (job.progress as JobProgressData | undefined) || null;

      // Extract entityId from FileUploadJobData (supports both old and new format for backward compatibility)
      let companyId: string | undefined;
      let dealId: string | undefined;

      // Check if it's FileUploadJobData with new format
      if ("entityType" in jobData && "entityId" in jobData) {
        const fileUploadData = jobData as FileUploadJobData;
        if (fileUploadData.entityType === "COMPANY") {
          companyId = fileUploadData.entityId;
        } else if (fileUploadData.entityType === "DEAL") {
          dealId = fileUploadData.entityId;
        }
      } else if (queueName === QUEUE_NAMES.FILE_UPLOAD) {
        // Old format: companyId (backward compatibility for old jobs)
        const oldFormatData = jobData as any;
        if (typeof oldFormatData.companyId === "string") {
          companyId = oldFormatData.companyId;
        }
      }

      userJobs.push({
        jobId: job.id!,
        queueName: queueName as JobType,
        state,
        progress,
        createdAt: job.timestamp || Date.now(),
        updatedAt: job.processedOn || job.timestamp || Date.now(),
        returnvalue: job.returnvalue,
        failedReason: job.failedReason || null,
        attemptsMade: job.attemptsMade,
        userId: jobData.userId,
        dealId: "dealId" in jobData ? jobData.dealId : dealId,
        companyId: companyId,
        fileName: "fileName" in jobData ? jobData.fileName : undefined,
        screenerId: "screenerId" in jobData ? jobData.screenerId : undefined,
      });
    }
  }

  // Sort by createdAt descending (most recent first)
  return userJobs.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get latest N jobs for a specific user
 * Optimized for sidebar display
 */
export async function getLatestUserJobs(
  userId: string,
  limit: number = 5,
): Promise<JobWithMetadata[]> {
  const allJobs = await getAllUserJobs(userId);
  return allJobs.slice(0, limit);
}

/**
 * Delete a job from the queue
 * Verifies the job belongs to the user before deleting
 */
export async function deleteUserJob(
  userId: string,
  jobId: string,
  queueName: string,
): Promise<boolean> {
  // First verify the job belongs to the user
  const userJobs = await getAllUserJobs(userId);
  const job = userJobs.find(
    (j) => j.jobId === jobId && j.queueName === queueName,
  );

  if (!job) {
    throw new Error("Job not found or does not belong to user");
  }

  // Get the queue
  let queue: Queue;
  if (queueName === QUEUE_NAMES.SCREEN_DEAL) {
    queue = screenDealQueue;
  } else if (queueName === QUEUE_NAMES.FILE_UPLOAD) {
    queue = fileUploadQueue;
  } else if (queueName === QUEUE_NAMES.DEAL_TO_COMPANY) {
    queue = dealToCompanyQueue;
  } else {
    throw new Error(`Unknown queue name: ${queueName}`);
  }

  // Get the job and remove it
  const bullmqJob = await queue.getJob(jobId);
  if (!bullmqJob) {
    throw new Error("Job not found in queue");
  }

  // Remove the job from the queue
  await bullmqJob.remove();

  return true;
}
