import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL as string;
const redisUrlToUse = redisUrl ?? "redis://127.0.0.1:6379";

// BullMQ requires ioredis (not node-redis)
// maxRetriesPerRequest: null is required for BullMQ
const connection = new IORedis(redisUrlToUse, {
  maxRetriesPerRequest: null,
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

export interface FileUploadJobData {
  jobId: string;
  fileName: string;
  fileBuffer: string; // base64 encoded
  userId?: string;
}

// Progress types
export interface JobProgressData {
  step: string;
  percentage: number;
}

// Helper function to get job status and progress
export async function getJobStatus(queueName: string, jobId: string) {
  const queue = queueName === QUEUE_NAMES.SCREEN_DEAL ? screenDealQueue : fileUploadQueue;
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
