export type RagIngestionParams = {
  documentId: string;
  userId: string | null;
  forceReingest?: boolean;
};

export type FileUploadParams = {
  jobId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  userId: string | null;
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

/**
 * Two screening “modes” for listing context (deal-scoped template screening only):
 * - **deal_opportunity_db**: use `DealOpportunity` in Postgres (main app CIM screening).
 * - **bitrix_live_snapshot**: use a live `crm.deal.get` dump aligned with the embedded widget (Bitrix widget only; does not use DB listing fields for prompts).
 */
export type CimScreeningDealListingContextSource =
  | "deal_opportunity_db"
  | "bitrix_live_snapshot";

/** Library CIM upload: set documentId. Deal opportunity (multi-doc RAG): set dealOpportunityId. */
export type CimScreeningParams = {
  jobId: string;
  userId: string | null;
  screenerId: string;
  sessionId: string;
  runId: string;
  /** Firm library CIM PDF */
  documentId?: string;
  /** Template screening across all ingested chunks for this deal */
  dealOpportunityId?: string;
  /**
   * When set, RAG retrieval is limited to these deal document ids (Postgres chunk slice).
   * Omit to use all chunks for the deal (default).
   */
  dealScreeningDocumentIds?: string[];
  /** Optional Bitrix deal id for timeline writeback on completion. */
  bitrixDealId?: string;
  /** When true and bitrixDealId is set, post completion summary comment to Bitrix. */
  postBitrixComment?: boolean;
  /**
   * Which structured deal listing to inject into screening prompts (defaults to `deal_opportunity_db` for deal runs).
   * Omit for library-document screening (ignored).
   */
  dealListingContextSource?: CimScreeningDealListingContextSource;
  /**
   * Required when `dealListingContextSource === "bitrix_live_snapshot"`: plain-text listing from Bitrix REST
   * (same presentation as the widget). Built server-side when starting the widget run.
   */
  bitrixLiveDealListingContext?: string;
};

export type CimMonographScreeningParams = {
  jobId: string;
  userId: string | null;
  screenerId: string;
  sessionId: string;
  runId: string;
  dealOpportunityId: string;
  targetDocumentId: string;
  bitrixDealId?: string;
  postBitrixComment?: boolean;
  dealListingContextSource?: CimScreeningDealListingContextSource;
  bitrixLiveDealListingContext?: string;
};

export type IcScorerWorkflowParams = {
  jobId: string;
  userId: string | null;
  runId: string;
  dealOpportunityId: string;
  bitrixDealId: string;
  mode: "rag" | "monograph";
  targetDocumentId?: string;
  bitrixLiveDealListingContext: string;
};

export type ProjectKickoffScreenParams = {
  jobId: string;
  kickoffId: string;
  screeningId: string;
  userId: string | null;
};

/** Cloudflare Worker env with workflow bindings (see wrangler.jsonc) */
export interface WorkflowWorkerEnv {
  DB: D1Database;
  DOCUMENT_CHUNKS_INDEX: VectorizeIndex;
  SCREEN_DEAL_WORKFLOW: Workflow<ScreenDealParams>;
  FILE_UPLOAD_WORKFLOW: Workflow<FileUploadParams>;
  CIM_EXTRACTION_WORKFLOW: Workflow<CimExtractionParams>;
  RAG_INGESTION_WORKFLOW: Workflow<RagIngestionParams>;
  CIM_SCREENING_WORKFLOW: Workflow<CimScreeningParams>;
  CIM_MONOGRAPH_SCREENING_WORKFLOW: Workflow<CimMonographScreeningParams>;
  IC_SCORER_WORKFLOW: Workflow<IcScorerWorkflowParams>;
  PROJECT_KICKOFF_SCREEN_WORKFLOW: Workflow<ProjectKickoffScreenParams>;
  RATE_LIMIT_KV?: KVNamespace;
}
