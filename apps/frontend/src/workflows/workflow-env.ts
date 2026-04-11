export type RagIngestionParams = {
  documentId: string;
  userId: string;
  forceReingest?: boolean;
};

export type FileUploadParams = {
  jobId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  entityType: "DEAL" | "DEAL_OPPORTUNITY";
  entityId: string;
  entityMetadata: {
    name: string;
    sector: string | null;
    stage: string | null;
    headquarters: string | null;
    revenue: number | null;
    ebitda: number | null;
  };
  fileCategory?: string;
  fileDescription?: string;
  contentHash: string;
};

export type CimExtractionParams = {
  dealCimId: string;
  documentId?: string;
  dealOpportunityId?: string;
  filePath: string;
  userId?: string;
};

export type ScreenDealParams =
  | {
      mode: "manual";
      jobId: string;
      userId: string;
      dealId: string;
      dealOpportunityId: string;
    }
  | {
      mode: "ai";
      jobId: string;
      userId: string;
      dealId: string;
      screenerId: string;
      dealOpportunityId?: string;
    };

/** Library CIM upload: set documentId. Deal opportunity (multi-doc RAG): set dealOpportunityId. */
export type CimScreeningParams = {
  jobId: string;
  userId: string;
  screenerId: string;
  sessionId: string;
  runId: string;
  /** Firm library CIM PDF */
  documentId?: string;
  /** Template screening across all ingested chunks for this deal */
  dealOpportunityId?: string;
};

/** Cloudflare Worker env with workflow bindings (see wrangler.jsonc) */
export interface WorkflowWorkerEnv {
  DOCUMENT_CHUNKS_INDEX: VectorizeIndex;
  SCREEN_DEAL_WORKFLOW: Workflow<ScreenDealParams>;
  FILE_UPLOAD_WORKFLOW: Workflow<FileUploadParams>;
  CIM_EXTRACTION_WORKFLOW: Workflow<CimExtractionParams>;
  RAG_INGESTION_WORKFLOW: Workflow<RagIngestionParams>;
  CIM_SCREENING_WORKFLOW: Workflow<CimScreeningParams>;
  RATE_LIMIT_KV?: KVNamespace;
}
