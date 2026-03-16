import { Queue } from "bullmq";
import { connection } from "./connection";
import { QUEUE_NAMES } from "./types";

const defaultJobOptions = {
  removeOnComplete: 100,
  removeOnFail: 100,
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
};

export const screenDealQueue = new Queue(QUEUE_NAMES.SCREEN_DEAL, {
  connection,
  defaultJobOptions,
});

export const fileUploadQueue = new Queue(QUEUE_NAMES.FILE_UPLOAD, {
  connection,
  defaultJobOptions,
});

export const cimExtractionQueue = new Queue(QUEUE_NAMES.CIM_EXTRACTION, {
  connection,
  defaultJobOptions,
});

export const ragIngestionQueue = new Queue(QUEUE_NAMES.RAG_INGESTION, {
  connection,
  defaultJobOptions,
});
