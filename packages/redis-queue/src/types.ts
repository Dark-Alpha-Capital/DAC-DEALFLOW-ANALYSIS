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
export type JobType =
  | "screen-deal"
  | "file-upload"
  | "cim-extraction"
  | "rag-ingestion";

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
  returnvalue: unknown;
  failedReason: string | null;
  attemptsMade: number;
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
  RAG_INGESTION: "rag-ingestion",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

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

export type EntityMetadata = CompanyMetadata;

export interface FileUploadJobData {
  jobId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  entityType: "DEAL" | "DEAL_OPPORTUNITY";
  entityId: string;
  entityMetadata: EntityMetadata;
  embedInVectorStore?: boolean;
  fileCategory?: string;
  fileDescription?: string;
  step?: string;
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

export interface CIMExtractionJobData {
  simId: string;
  documentId?: string;
  dealOpportunityId?: string;
  filePath: string;
  userId?: string;
}

export interface RagIngestionJobData {
  jobId: string;
  documentId: string;
  userId: string;
  forceReingest?: boolean;
}

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
    case QUEUE_NAMES.RAG_INGESTION:
      return "RAG Ingestion";
    default:
      return queueName;
  }
}
