import type { BitrixScreeningWidgetBootstrapInput } from "@/lib/server/load-bitrix-screening-widget-bootstrap";
import type {
  DealDocumentRow,
  DisplayIngestionPipelineRow,
  IngestionPipelineJobRow,
  WidgetBootstrap,
} from "./types";

export const INGEST_IN_FLIGHT = new Set(["PENDING", "PROCESSING"]);

export function formatChunkIdForUi(chunkId: string): string {
  return chunkId.length > 18 ? `${chunkId.slice(0, 16)}…` : chunkId;
}

export function bitrixWidgetBootstrapInputsMatch(
  dealId: string,
  workspace: {
    memberId?: string;
    expiresAt?: number;
    authSig?: string;
    authId?: string;
    appSid?: string;
    domain?: string;
  },
  pref: BitrixScreeningWidgetBootstrapInput | null | undefined,
): boolean {
  if (!pref || pref.dealId !== dealId) return false;
  return (
    pref.memberId === workspace.memberId &&
    pref.expiresAt === workspace.expiresAt &&
    pref.authSig === workspace.authSig &&
    pref.authId === workspace.authId &&
    pref.appSid === workspace.appSid &&
    pref.domain === workspace.domain
  );
}

export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function pendingUploadKey(file: File): string {
  return `${file.name}\0${file.size}\0${file.lastModified}`;
}

export function fileExtensionFromName(fileName: string): string {
  const t = fileName.trim();
  const dot = t.lastIndexOf(".");
  if (dot <= 0 || dot === t.length - 1) return "—";
  return t.slice(dot + 1).toLowerCase();
}

export function formatFileSizeBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"] as const;
  let v = n;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  const rounded = u === 0 || v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${units[u]}`;
}

export function screeningStillRunning(status: string | undefined): boolean {
  return (
    status === "PENDING" || status === "INGESTING" || status === "SCREENING"
  );
}

export function screeningFailed(status: string | undefined): boolean {
  return status === "FAILED";
}

export function pipelineKindLabel(kind: string): string {
  switch (kind) {
    case "file-upload":
      return "Upload & save";
    case "rag-ingestion":
      return "Index for search";
    default:
      return kind;
  }
}

function pipelineProgressCaption(job: IngestionPipelineJobRow): string {
  const step = job.progressStep?.trim();
  if (step) return step;
  return job.state === "waiting" ? "Starting…" : job.state;
}

/** One UI row per file: merges the usual file-upload + rag-ingestion pair (same file name). */
export function mergeIngestionPipelineJobsForDisplay(
  jobs: IngestionPipelineJobRow[] | undefined | null,
): DisplayIngestionPipelineRow[] {
  if (!jobs?.length) return [];

  const groupKey = (job: IngestionPipelineJobRow) => {
    const n = job.fileName?.trim();
    return n && n.length > 0 ? n : `__inst:${job.instanceId}`;
  };

  const groups = new Map<string, IngestionPipelineJobRow[]>();
  for (const job of jobs) {
    const k = groupKey(job);
    const g = groups.get(k) ?? [];
    g.push(job);
    groups.set(k, g);
  }

  const rows: Array<DisplayIngestionPipelineRow & { sortTs: number }> = [];

  for (const [, group] of groups) {
    const uploads = group.filter((j) => j.workflowKind === "file-upload");
    const rags = group.filter((j) => j.workflowKind === "rag-ingestion");
    const pair =
      group.length === 2 && uploads.length === 1 && rags.length === 1;

    if (!pair) {
      for (const job of group) {
        rows.push({
          key: job.instanceId,
          fileName: job.fileName ?? null,
          phaseLabel: pipelineKindLabel(job.workflowKind),
          progressStep: pipelineProgressCaption(job),
          progressPercent: job.progressPercent,
          state: job.state,
          sortTs: new Date(job.updatedAt).getTime(),
        });
      }
      continue;
    }

    const upload = uploads[0]!;
    const rag = rags[0]!;
    const primary =
      rag && (!upload || upload.progressPercent >= 100) ? rag : upload;

    rows.push({
      key: groupKey(upload),
      fileName: upload.fileName ?? rag.fileName ?? null,
      phaseLabel: "Upload & indexing",
      progressStep: pipelineProgressCaption(primary),
      progressPercent: primary.progressPercent,
      state: primary.state,
      sortTs: Math.max(
        new Date(upload.updatedAt).getTime(),
        new Date(rag.updatedAt).getTime(),
      ),
    });
  }

  rows.sort((a, b) => b.sortTs - a.sortTs);
  return rows.map(({ sortTs: _s, ...row }) => row);
}

export function ingestionStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Queued";
    case "PROCESSING":
      return "Indexing…";
    case "PROCESSED":
      return "Indexed";
    case "FAILED":
      return "Failed";
    case "SKIPPED":
      return "Skipped (duplicate)";
    default:
      return status;
  }
}

export type IngestionSummary = {
  total: number;
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  skipped: number;
  inFlight: number;
  finishedPipeline: number;
  pct: number;
};

export function summarizeIngestion(docs: DealDocumentRow[]): IngestionSummary {
  const total = docs.length;
  let pending = 0;
  let processing = 0;
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  for (const d of docs) {
    switch (d.ingestionStatus) {
      case "PENDING":
        pending += 1;
        break;
      case "PROCESSING":
        processing += 1;
        break;
      case "PROCESSED":
        processed += 1;
        break;
      case "FAILED":
        failed += 1;
        break;
      case "SKIPPED":
        skipped += 1;
        break;
      default:
        break;
    }
  }
  const inFlight = pending + processing;
  const finishedPipeline = total - inFlight;
  const pct =
    total > 0 ? Math.min(100, Math.round((finishedPipeline / total) * 100)) : 0;
  return {
    total,
    pending,
    processing,
    processed,
    failed,
    skipped,
    inFlight,
    finishedPipeline,
    pct,
  };
}

export function hasBitrixFieldValue(value: string): boolean {
  const t = value.trim();
  return t !== "" && t !== "—";
}

export function startScreeningBlockedReason(args: {
  data: WidgetBootstrap;
  effectiveScreenerId: string;
  indexed: boolean;
  runPending: boolean;
  ingestBusy: boolean;
}): string | null {
  const { data, effectiveScreenerId, indexed, runPending, ingestBusy } = args;
  if (runPending) return "Starting screening…";
  if (data.activeJobs.length > 0) {
    return "Screening is already running for this deal (workflow job in progress). Wait for it to finish.";
  }
  if (!effectiveScreenerId) {
    return data.screeners.length === 0
      ? "No screeners exist in the app."
      : "Select a screener from the dropdown.";
  }
  const pipelineBusy = (data.ingestionPipelineJobs?.length ?? 0) > 0;
  if (pipelineBusy) {
    return "Upload or indexing workflow still running — see In progress below.";
  }
  if (ingestBusy) {
    return "File ingestion still in progress. Wait until documents show as processed.";
  }
  if (!indexed) {
    return "Upload at least one document below and wait until it is indexed (chunks > 0).";
  }
  return null;
}
