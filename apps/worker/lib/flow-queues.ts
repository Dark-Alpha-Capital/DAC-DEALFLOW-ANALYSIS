/**
 * Queue names for BullMQ Flow child jobs.
 *
 * Flow structure:
 * - Screen Deal: fetch-data -> process-chunks -> finalize
 * - File Upload: validate -> compress -> upload -> finalize
 */
export const FLOW_QUEUE_NAMES = {
  // Screen deal child queues (sequential execution)
  SCREEN_DEAL_FETCH: "screen-deal:fetch",
  SCREEN_DEAL_PROCESS_CHUNKS: "screen-deal:process-chunks",
  SCREEN_DEAL_FINALIZE: "screen-deal:finalize",

  // File upload child queues (sequential execution)
  FILE_UPLOAD_VALIDATE: "file-upload:validate",
  FILE_UPLOAD_COMPRESS: "file-upload:compress",
  FILE_UPLOAD_UPLOAD: "file-upload:upload",
  FILE_UPLOAD_FINALIZE: "file-upload:finalize",
} as const;

export type FlowQueueName =
  (typeof FLOW_QUEUE_NAMES)[keyof typeof FLOW_QUEUE_NAMES];

/**
 * Default job options for flow child jobs.
 * Each child job can be retried independently.
 */
export const FLOW_DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100,
  removeOnFail: 100,
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
};

/**
 * Total number of steps for progress tracking
 */
export const FLOW_STEP_COUNTS = {
  SCREEN_DEAL: 3, // fetch, process-chunks, finalize
  FILE_UPLOAD: 4, // validate, compress, upload, finalize
} as const;
