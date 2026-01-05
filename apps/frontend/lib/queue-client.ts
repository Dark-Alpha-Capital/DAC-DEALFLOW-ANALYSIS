import { Queue, FlowProducer, FlowJob } from "bullmq";
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

// Flow queue names for child jobs
export const FLOW_QUEUE_NAMES = {
  SCREEN_DEAL_FETCH: "screen-deal:fetch",
  SCREEN_DEAL_PROCESS_CHUNKS: "screen-deal:process-chunks",
  SCREEN_DEAL_FINALIZE: "screen-deal:finalize",
  FILE_UPLOAD_VALIDATE: "file-upload:validate",
  FILE_UPLOAD_COMPRESS: "file-upload:compress",
  FILE_UPLOAD_UPLOAD: "file-upload:upload",
  FILE_UPLOAD_FINALIZE: "file-upload:finalize",
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

// ============================================================================
// BullMQ Flows - Idempotent Job Processing
// ============================================================================

/**
 * FlowProducer for creating job flows.
 * Flows allow parent-child job relationships where the parent
 * waits for all children to complete before processing.
 */
export const flowProducer = new FlowProducer({ connection });

/**
 * Default job options for flow child jobs
 */
const FLOW_DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100,
  removeOnFail: 100,
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
};

/**
 * Builds the screen-deal flow structure.
 *
 * Flow execution order (BullMQ processes children first, bottom-up):
 * 1. fetch-data (leaf child, runs first)
 * 2. process-chunks (depends on fetch-data)
 * 3. finalize (depends on process-chunks)
 * 4. screen-deal (parent, runs last)
 */
export function buildScreenDealFlow(data: ScreenDealJobData): FlowJob {
  return {
    name: "screen-deal",
    queueName: QUEUE_NAMES.SCREEN_DEAL,
    data,
    opts: {
      ...FLOW_DEFAULT_JOB_OPTIONS,
      jobId: data.jobId,
    },
    children: [
      {
        name: "finalize",
        queueName: FLOW_QUEUE_NAMES.SCREEN_DEAL_FINALIZE,
        data,
        opts: FLOW_DEFAULT_JOB_OPTIONS,
        children: [
          {
            name: "process-chunks",
            queueName: FLOW_QUEUE_NAMES.SCREEN_DEAL_PROCESS_CHUNKS,
            data,
            opts: FLOW_DEFAULT_JOB_OPTIONS,
            children: [
              {
                name: "fetch-data",
                queueName: FLOW_QUEUE_NAMES.SCREEN_DEAL_FETCH,
                data,
                opts: FLOW_DEFAULT_JOB_OPTIONS,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Builds the file-upload flow structure.
 *
 * Flow execution order:
 * 1. validate (runs first)
 * 2. compress (depends on validate)
 * 3. upload (depends on compress)
 * 4. finalize (depends on upload)
 * 5. file-upload (parent, runs last)
 */
export function buildFileUploadFlow(data: FileUploadJobData): FlowJob {
  return {
    name: "file-upload",
    queueName: QUEUE_NAMES.FILE_UPLOAD,
    data,
    opts: {
      ...FLOW_DEFAULT_JOB_OPTIONS,
      jobId: data.jobId,
    },
    children: [
      {
        name: "finalize",
        queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_FINALIZE,
        data,
        opts: FLOW_DEFAULT_JOB_OPTIONS,
        children: [
          {
            name: "upload",
            queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_UPLOAD,
            data,
            opts: FLOW_DEFAULT_JOB_OPTIONS,
            children: [
              {
                name: "compress",
                queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_COMPRESS,
                data,
                opts: FLOW_DEFAULT_JOB_OPTIONS,
                children: [
                  {
                    name: "validate",
                    queueName: FLOW_QUEUE_NAMES.FILE_UPLOAD_VALIDATE,
                    data,
                    opts: FLOW_DEFAULT_JOB_OPTIONS,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Creates a screen deal job using flows for idempotent processing.
 * Each step can be retried independently without re-running completed steps.
 */
export async function createScreenDealFlowJob(data: ScreenDealJobData) {
  const flow = buildScreenDealFlow(data);
  const result = await flowProducer.add(flow);
  return {
    parentJobId: result.job.id,
    flowJobId: data.jobId,
  };
}

/**
 * Creates a file upload job using flows for idempotent processing.
 */
export async function createFileUploadFlowJob(data: FileUploadJobData) {
  const flow = buildFileUploadFlow(data);
  const result = await flowProducer.add(flow);
  return {
    parentJobId: result.job.id,
    flowJobId: data.jobId,
  };
}

/**
 * Gets the status of a flow job including all child jobs.
 */
export async function getFlowJobStatus(queueName: string, jobId: string) {
  const queue =
    queueName === QUEUE_NAMES.SCREEN_DEAL ? screenDealQueue : fileUploadQueue;
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress as JobProgressData | undefined;

  // Get child job info for flows
  let childrenStatus: Array<{ name: string; state: string; progress?: JobProgressData }> = [];
  try {
    const dependencies = await job.getDependencies();
    if (dependencies.processed) {
      for (const [key, value] of Object.entries(dependencies.processed)) {
        childrenStatus.push({
          name: key.split(":").pop() || key,
          state: "completed",
          progress: { step: "Completed", percentage: 100 },
        });
      }
    }
    if (dependencies.unprocessed) {
      for (const key of dependencies.unprocessed) {
        childrenStatus.push({
          name: key.split(":").pop() || key,
          state: "pending",
          progress: { step: "Waiting", percentage: 0 },
        });
      }
    }
  } catch {
    // Not a flow job, ignore
  }

  return {
    jobId,
    state,
    progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    isFlow: childrenStatus.length > 0,
    children: childrenStatus,
  };
}
