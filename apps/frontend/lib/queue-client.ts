import { Queue } from "bullmq";
import IORedis from "ioredis";

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

// Queue names - must match the worker queue names
export const QUEUE_NAMES = {
  SCREEN_DEAL: "screen-deal",
  FILE_UPLOAD: "file-upload",
} as const;

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

export interface FileUploadJobData {
  jobId: string;
  fileName: string;
  tempFilePath: string; // Path to temporary file in Nextcloud (much smaller than base64)
  fileSize: number; // File size in bytes
  mimeType: string; // MIME type of the file
  userId: string; // Required - user who uploaded the file
  // Company context for file organization and metadata
  companyId: string;
  companyMetadata: CompanyMetadata;
  // Optional file metadata
  fileCategory?: string;
  fileDescription?: string;
}

// Progress types
export interface JobProgressData {
  step: string;
  percentage: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the status of a job including progress and result
 */
export async function getJobStatus(queueName: string, jobId: string) {
  const queue =
    queueName === QUEUE_NAMES.SCREEN_DEAL ? screenDealQueue : fileUploadQueue;
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
