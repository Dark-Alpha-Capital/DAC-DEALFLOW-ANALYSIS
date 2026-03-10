/**
 * Client-safe types and utilities for job tracking
 * This file can be imported in client components without pulling in BullMQ
 */

// Job status type
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

// Job type
export type JobType = "screen-deal" | "file-upload" | "cim-extraction";

// Progress data
export interface JobProgressData {
  step: string;
  percentage: number;
}

// Job with metadata for frontend display
export interface JobWithMetadata {
  jobId: string;
  queueName: JobType;
  state: JobStatus;
  progress: JobProgressData | null;
  createdAt: number;
  updatedAt: number;
  returnvalue: any;
  failedReason: string | null;
  attemptsMade: number;
  // Additional metadata from job.data
  userId: string;
  dealId?: string;
  companyId?: string;
  fileName?: string;
  screenerId?: string;
}

// Queue names constants (client-safe, no BullMQ dependency)
export const QUEUE_NAMES = {
  SCREEN_DEAL: "screen-deal",
  FILE_UPLOAD: "file-upload",
  CIM_EXTRACTION: "cim-extraction",
} as const;

/**
 * Get job type label for display
 */
export function getJobTypeLabel(queueName: string): string {
  switch (queueName) {
    case QUEUE_NAMES.SCREEN_DEAL:
      return "Screen Deal";
    case QUEUE_NAMES.FILE_UPLOAD:
      return "File Upload";
    case QUEUE_NAMES.CIM_EXTRACTION:
      return "CIM Extraction";
    default:
      return queueName;
  }
}
