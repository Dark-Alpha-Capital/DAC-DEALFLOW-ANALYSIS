/** Client-safe types for the IC scorer bootstrap payload (no server / Bitrix pull imports). */

export type IcScorerBootstrapInput = {
  dealId: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
};

export type IcScorerBootstrapFieldRow = {
  key: string;
  label: string;
  type: string | null;
  value: string;
};

export type IcScorerDealDocumentRow = {
  id: string;
  fileName: string;
  contentHash: string | null;
  ingestionStatus: string;
  ingestionError: string | null;
  createdAt: Date;
};

export type IcScorerIngestionPipelineJobRow = {
  instanceId: string;
  workflowKind: string;
  fileName: string | null;
  state: string;
  progressStep: string | null;
  progressPercent: number;
  updatedAt: Date;
};

export type IcScorerRecentRunRow = {
  runId: string;
  status: string;
  mode: string;
  errorMessage: string | null;
  createdAt: Date;
  targetDocumentId: string | null;
};

/** Loader-only: why Bitrix bootstrap was or was not prefetched (for UI + logs). */
export type IcScorerBootstrapPrefetchHint =
  | { kind: "ready" }
  | {
      kind: "skipped";
      reason: "missing_dealId" | "missing_widget_auth";
      hasAuth: boolean;
      /** True when `loadBitrixScreenWidgetPostContext` parsed a deal id from the Bitrix POST body. */
      dealIdFromBitrixPost: boolean;
      dealIdInSearch: boolean;
    }
  | { kind: "error"; message: string };

export type IcScorerBootstrapPayload = {
  dealId: string;
  dealOpportunityId: string;
  webhookConfigured: boolean;
  portalBaseUrl: string;
  title: string | null;
  stageId: string | null;
  amount: string | null;
  fields: IcScorerBootstrapFieldRow[];
  dealDocuments: IcScorerDealDocumentRow[];
  ingestionPipelineJobs: IcScorerIngestionPipelineJobRow[];
  indexedCount: number;
  vectorSettleMsAfterIngest: number;
  recentIcScorerRuns: IcScorerRecentRunRow[];
};
