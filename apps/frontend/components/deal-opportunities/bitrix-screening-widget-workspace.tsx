import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookMarked,
  Building2,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileStack,
  History,
  Info,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import {
  loadBitrixScreeningWidgetBootstrapData,
  type BitrixScreeningWidgetBootstrapInput,
  type BitrixScreeningWidgetBootstrapPayload,
} from "@/lib/server/load-bitrix-screening-widget-bootstrap";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EvidenceCitation } from "@/lib/map-cim-screening-evidence";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function formatChunkIdForUi(chunkId: string) {
  return chunkId.length > 18 ? `${chunkId.slice(0, 16)}…` : chunkId;
}

function EvidenceChunksCollapsible({
  citations,
  chunkIds,
}: {
  citations: EvidenceCitation[];
  chunkIds: string[];
}) {
  const hitCount = citations.length > 0 ? citations.length : chunkIds.length;
  if (hitCount === 0) return null;

  return (
    <Collapsible defaultOpen={false} className="w-full">
      <CollapsibleTrigger
        type="button"
        className={cn(
          "group border-border/70 bg-muted/30 flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition-colors duration-200",
          "hover:bg-muted/45 focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "motion-reduce:transition-none",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <BookMarked className="text-primary/80 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="text-foreground text-sm font-semibold tracking-tight">
              Evidence
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              {" · "}
              {hitCount} chunk hit{hitCount === 1 ? "" : "s"}
            </span>
          </span>
        </span>
        <ChevronDown
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 outline-none",
        )}
      >
        <div className="border-border/60 bg-background/70 mt-1.5 max-h-72 overflow-y-auto rounded-md border p-2 shadow-inner">
          {citations.length > 0 ? (
            <ol className="marker:text-muted-foreground list-decimal space-y-3 pl-3 text-xs leading-relaxed wrap-anywhere">
              {citations.map((c, idx) => (
                <li key={`${c.chunkId}-${idx}`} className="pl-1">
                  <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium tracking-wide uppercase">
                    <span>
                      {c.pageNumber != null
                        ? `Page ${c.pageNumber}`
                        : "Excerpt"}
                    </span>
                    <code className="bg-muted/90 text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-normal tracking-normal normal-case">
                      {formatChunkIdForUi(c.chunkId)}
                    </code>
                  </div>
                  {c.excerpt ? (
                    <p className="text-foreground max-w-prose text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
                      {c.excerpt}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-[0.8125rem] italic">
                      No stored text for chunk{" "}
                      <code className="bg-muted rounded px-1 font-mono text-[0.65rem] not-italic">
                        {formatChunkIdForUi(c.chunkId)}
                      </code>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
              Chunk IDs: {chunkIds.map(formatChunkIdForUi).join(", ")}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type Props = {
  dealId: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
  loaderBootstrap?: BitrixScreeningWidgetBootstrapPayload | null;
  loaderBootstrapInput?: BitrixScreeningWidgetBootstrapInput | null;
};

function bitrixWidgetBootstrapInputsMatch(
  dealId: string,
  workspace: Pick<
    Props,
    "memberId" | "expiresAt" | "authSig" | "authId" | "appSid" | "domain"
  >,
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

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function pendingUploadKey(file: File) {
  return `${file.name}\0${file.size}\0${file.lastModified}`;
}

function fileExtensionFromName(fileName: string): string {
  const t = fileName.trim();
  const dot = t.lastIndexOf(".");
  if (dot <= 0 || dot === t.length - 1) return "—";
  return t.slice(dot + 1).toLowerCase();
}

function formatFileSizeBytes(n: number): string {
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

function screeningStillRunning(status: string | undefined) {
  return (
    status === "PENDING" || status === "INGESTING" || status === "SCREENING"
  );
}

function screeningFailed(status: string | undefined) {
  return status === "FAILED";
}

const INGEST_IN_FLIGHT = new Set(["PENDING", "PROCESSING"]);

function pipelineKindLabel(kind: string) {
  switch (kind) {
    case "file-upload":
      return "Upload & save";
    case "rag-ingestion":
      return "Index for search";
    default:
      return kind;
  }
}

type IngestionPipelineJobRow = NonNullable<
  BitrixScreeningWidgetBootstrapPayload["ingestionPipelineJobs"]
>[number];

type DisplayIngestionPipelineRow = {
  key: string;
  fileName: string | null;
  phaseLabel: string;
  progressStep: string;
  progressPercent: number;
  state: string;
};

function pipelineProgressCaption(job: IngestionPipelineJobRow): string {
  const step = job.progressStep?.trim();
  if (step) return step;
  return job.state === "waiting" ? "Starting…" : job.state;
}

/** One UI row per file: merges the usual file-upload + rag-ingestion pair (same file name). */
function mergeIngestionPipelineJobsForDisplay(
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

function ingestionStatusLabel(status: string) {
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

type WidgetBootstrap = BitrixScreeningWidgetBootstrapPayload;

type DealDocumentRow = WidgetBootstrap["dealDocuments"][number];

type LastRunAnswer = NonNullable<WidgetBootstrap["lastRun"]>["answers"][number];

type ScreeningRunDetail = NonNullable<
  inferRouterOutputs<AppRouter>["dealOpportunities"]["getBitrixScreeningWidgetRunDetail"]["run"]
>;

const ScreeningResultQuestionItem = memo(function ScreeningResultQuestionItem({
  answer,
  displayIndex,
  totalQuestions,
}: {
  answer: LastRunAnswer;
  displayIndex: number;
  totalQuestions: number;
}) {
  const scoreDisplay =
    answer.score != null && Number.isFinite(answer.score)
      ? `${answer.score}/10`
      : "—/10";

  return (
    <li className="mb-10 last:mb-0">
      <article className="flex gap-2 sm:gap-3">
        <div
          className="flex w-8 shrink-0 flex-col items-center sm:w-9"
          aria-hidden
        >
          <span
            className={cn(
              "bg-muted/60 text-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold tabular-nums",
              "sm:size-8 sm:text-xs",
            )}
          >
            {displayIndex}
          </span>
          <span className="text-muted-foreground mt-0.5 hidden text-[9px] font-medium sm:block">
            / {totalQuestions}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-muted-foreground font-mono text-[9px] font-semibold tracking-widest uppercase">
                Question {displayIndex} of {totalQuestions}
              </p>
              <h3 className="text-foreground max-w-prose text-sm leading-snug font-semibold tracking-tight text-pretty sm:text-[0.9375rem]">
                {answer.question}
              </h3>
            </div>
            <div
              className={cn(
                "bg-primary/8 flex shrink-0 flex-col items-end gap-0 rounded-md px-2 py-1 text-right",
                "min-w-[3.25rem]",
              )}
              aria-label={
                answer.score != null && Number.isFinite(answer.score)
                  ? `Score ${answer.score} out of 10`
                  : "Score not available (scale out of 10)"
              }
            >
              <span className="text-muted-foreground text-[0.6rem] font-semibold tracking-wide uppercase">
                Score
              </span>
              <span className="text-foreground font-mono text-sm leading-none font-bold tabular-nums sm:text-base">
                {scoreDisplay}
              </span>
            </div>
          </div>

          <div className="bg-muted/25 rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2">
            <p className="text-muted-foreground mb-0.5 text-[0.6rem] font-semibold tracking-wide uppercase">
              Rationale
            </p>
            <p className="text-foreground max-w-prose text-xs leading-relaxed whitespace-pre-wrap sm:text-[0.8125rem]">
              {answer.rationale?.trim() ? answer.rationale : "—"}
            </p>
          </div>

          <EvidenceChunksCollapsible
            citations={answer.evidenceCitations ?? []}
            chunkIds={answer.evidenceChunkIds ?? []}
          />
        </div>
      </article>
    </li>
  );
});

function summarizeIngestion(docs: DealDocumentRow[]) {
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

function hasBitrixFieldValue(value: string): boolean {
  const t = value.trim();
  return t !== "" && t !== "—";
}

function startScreeningBlockedReason(args: {
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

type WizardStep = 1 | 2 | 3;

function WizardStepNav({
  step,
  onStepChange,
  canOpenStep2,
}: {
  step: WizardStep;
  onStepChange: (s: WizardStep) => void;
  canOpenStep2: boolean;
}) {
  const items: {
    id: WizardStep;
    title: string;
    hint: string;
    locked: boolean;
  }[] = [
    { id: 1, title: "Ingest", hint: "Upload & index", locked: false },
    {
      id: 2,
      title: "Screener",
      hint: "Choose template",
      locked: !canOpenStep2,
    },
    { id: 3, title: "Results", hint: "Runs & answers", locked: false },
  ];

  return (
    <nav aria-label="Screening steps">
      <ol className="flex flex-col gap-0 sm:flex-row sm:items-center">
        {items.map((it, idx) => {
          const active = step === it.id;
          const done = step > it.id;
          return (
            <li key={it.id} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                disabled={it.locked}
                onClick={() => onStepChange(it.id)}
                className={cn(
                  "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors sm:py-1",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-45",
                  active && "bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                    active &&
                      "border-primary bg-primary text-primary-foreground",
                    !active &&
                      done &&
                      "border-emerald-600/50 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-400",
                    !active &&
                      !done &&
                      "border-border text-muted-foreground bg-background",
                  )}
                  aria-hidden
                >
                  {done ? <CheckCircle2 className="size-3.5" /> : it.id}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[13px] font-medium tracking-tight",
                      active && "text-foreground",
                      !active && "text-muted-foreground",
                    )}
                  >
                    {it.title}
                  </span>
                  <span className="text-muted-foreground block text-xs leading-snug">
                    {it.hint}
                  </span>
                </span>
              </button>
              {idx < items.length - 1 ? (
                <span
                  className="bg-border mx-1 hidden h-px w-6 shrink-0 sm:block"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const DocumentStatusIcon = memo(function DocumentStatusIcon({
  status,
}: {
  status: string;
}) {
  if (INGEST_IN_FLIGHT.has(status)) {
    return (
      <Loader2
        className="text-muted-foreground size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
        aria-hidden
      />
    );
  }
  if (status === "PROCESSED") {
    return (
      <CheckCircle2
        className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
    );
  }
  if (status === "FAILED") {
    return (
      <AlertCircle className="text-destructive size-3.5 shrink-0" aria-hidden />
    );
  }
  return null;
});

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 font-medium wrap-break-word">{value}</span>
    </div>
  );
}

export function BitrixScreeningWidgetWorkspace({
  dealId,
  memberId,
  expiresAt,
  authSig,
  authId,
  appSid,
  domain,
  loaderBootstrap,
  loaderBootstrapInput,
}: Props) {
  const trpc = useTRPC();
  const widgetInput = useMemo(
    () => ({
      dealId,
      memberId,
      expiresAt,
      authSig,
      authId,
      appSid,
      domain,
    }),
    [dealId, memberId, expiresAt, authSig, authId, appSid, domain],
  );

  const bootstrapInitialData = useMemo((): WidgetBootstrap | undefined => {
    if (
      loaderBootstrap &&
      bitrixWidgetBootstrapInputsMatch(
        dealId,
        {
          memberId,
          expiresAt,
          authSig,
          authId,
          appSid,
          domain,
        },
        loaderBootstrapInput,
      )
    ) {
      return loaderBootstrap;
    }
    return undefined;
  }, [
    loaderBootstrap,
    loaderBootstrapInput,
    dealId,
    memberId,
    expiresAt,
    authSig,
    authId,
    appSid,
    domain,
  ]);

  const [screenerId, setScreenerId] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  /** `null` = show the latest run from bootstrap (refetches with polling). Set to a past `runId` to load that run’s answers. */
  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [documentToDelete, setDocumentToDelete] =
    useState<DealDocumentRow | null>(null);

  const q = useQuery({
    queryKey: ["bitrix-screening-widget-bootstrap", widgetInput],
    queryFn: () =>
      loadBitrixScreeningWidgetBootstrapData({ data: widgetInput }),
    initialData: bootstrapInitialData,
    staleTime: bootstrapInitialData ? 5_000 : 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.activeJobs.length > 0) return 4_000;
      if (screeningStillRunning(data.lastRun?.status)) return 4_000;
      if ((data.ingestionPipelineJobs?.length ?? 0) > 0) return 2_000;
      const ingestBusy = data.dealDocuments.some(
        (doc: DealDocumentRow) =>
          doc.ingestionStatus === "PENDING" ||
          doc.ingestionStatus === "PROCESSING",
      );
      if (ingestBusy) return 3_000;
      return false;
    },
  });

  const upload = useMutation(
    trpc.dealOpportunities.uploadBitrixScreeningWidgetDocuments.mutationOptions(
      {
        onSuccess: (res) => {
          const n = res.uploaded.length;
          const s = res.skippedDuplicate.length;
          if (n > 0) toast.success(`Queued ${n} file(s) for ingestion`);
          if (s > 0) {
            toast.message(
              `${s} duplicate(s) skipped (same content already on deal)`,
            );
          }
          setUploadFiles([]);
          void q.refetch();
        },
        onError: (e) => toast.error(e.message || "Upload failed"),
      },
    ),
  );

  const run = useMutation(
    trpc.dealOpportunities.startBitrixScreeningWidgetRun.mutationOptions({
      onSuccess: () => {
        setViewRunId(null);
        setWizardStep(3);
        toast.success(
          `Screening started (waited ${Math.round((q.data?.vectorSettleMsAfterIngest ?? 12_000) / 1000)}s for vector index)`,
        );
        void q.refetch();
      },
      onError: (e) => toast.error(e.message || "Could not start screening"),
    }),
  );

  const deleteDealDocument = useMutation(
    trpc.dealOpportunities.deleteBitrixScreeningWidgetDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document deleted");
        setDocumentToDelete(null);
        void q.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Could not delete document"),
    }),
  );

  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;
    const files = await Promise.all(
      uploadFiles.map(async (file) => ({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileData: await toBase64(file),
      })),
    );
    await upload.mutateAsync({
      ...widgetInput,
      files,
      description: "Bitrix widget upload",
      category: "OTHER",
    });
  }, [uploadFiles, upload, widgetInput]);

  const removePendingUpload = useCallback((key: string) => {
    setUploadFiles((prev) => prev.filter((f) => pendingUploadKey(f) !== key));
  }, []);

  const d = q.data;
  const screeners = d?.screeners ?? [];
  const latestRunId = d?.lastRun?.runId;

  const shouldFetchRunDetail = Boolean(
    latestRunId && viewRunId !== null && viewRunId !== latestRunId,
  );

  const runDetailInput = useMemo(() => {
    const rid = viewRunId ?? latestRunId;
    return {
      ...widgetInput,
      // Valid placeholder when bootstrap not loaded; query stays disabled.
      runId: rid && rid.length > 0 ? rid : "bootstrap-pending",
    };
  }, [widgetInput, viewRunId, latestRunId]);

  const runDetailQuery = useQuery({
    ...trpc.dealOpportunities.getBitrixScreeningWidgetRunDetail.queryOptions(
      runDetailInput,
    ),
    enabled: shouldFetchRunDetail,
  });

  const displayRun: ScreeningRunDetail | null = useMemo(() => {
    if (!d?.lastRun) return null;
    if (viewRunId === null || viewRunId === d.lastRun.runId) {
      return d.lastRun;
    }
    return runDetailQuery.data?.run ?? null;
  }, [d?.lastRun, viewRunId, runDetailQuery.data?.run]);

  const viewingRunDetailLoading =
    shouldFetchRunDetail && runDetailQuery.isPending && !runDetailQuery.data;

  const effectiveScreenerId = useMemo(
    () => screenerId || screeners[0]?.id || "",
    [screenerId, screeners],
  );

  const handleStartScreening = useCallback(() => {
    run.mutate({ ...widgetInput, screenerId: effectiveScreenerId });
  }, [run, widgetInput, effectiveScreenerId]);

  const indexed = (d?.indexedCount ?? 0) > 0;
  const ingestSummary = useMemo(
    () => (d ? summarizeIngestion(d.dealDocuments) : null),
    [d],
  );
  const displayIngestionPipelineJobs = useMemo(
    () => mergeIngestionPipelineJobsForDisplay(d?.ingestionPipelineJobs),
    [d?.ingestionPipelineJobs],
  );
  const pipelineBusy = (d?.ingestionPipelineJobs?.length ?? 0) > 0;
  const ingestBusy = useMemo(() => {
    if (!d) return false;
    return (
      pipelineBusy ||
      d.dealDocuments.some(
        (doc: DealDocumentRow) =>
          doc.ingestionStatus === "PENDING" ||
          doc.ingestionStatus === "PROCESSING",
      )
    );
  }, [d, pipelineBusy]);

  const runBlocked = useMemo(() => {
    if (d == null) return null;
    return startScreeningBlockedReason({
      data: d,
      effectiveScreenerId,
      indexed,
      runPending: run.isPending,
      ingestBusy,
    });
  }, [d, effectiveScreenerId, indexed, run.isPending, ingestBusy]);

  const canRun = d != null && runBlocked === null;

  const bitrixFilledFields = useMemo(
    () =>
      (d?.bitrixDealFields ?? []).filter((row) =>
        hasBitrixFieldValue(row.value),
      ),
    [d?.bitrixDealFields],
  );

  const orderedScreeningAnswers = useMemo(() => {
    const list = displayRun?.answers;
    if (!list?.length) return [];
    return [...list].sort((a, b) => {
      const pa = a.position ?? 0;
      const pb = b.position ?? 0;
      if (pa !== pb) return pa - pb;
      return a.questionId.localeCompare(b.questionId);
    });
  }, [displayRun?.answers]);

  const effectiveViewRunId = viewRunId ?? latestRunId ?? null;

  const canOpenStep2 = indexed;

  const goWizardStep = useCallback(
    (s: WizardStep) => {
      if (s === 2 && !canOpenStep2) return;
      setWizardStep(s);
    },
    [canOpenStep2],
  );

  useEffect(() => {
    if (!d) return;
    if (import.meta.env.DEV) {
      console.info("[Bitrix screening widget]", {
        bitrixDealId: d.bitrixDealId,
        indexedChunks: d.indexedCount,
        documents: d.dealDocuments.length,
        pipelineJobs: d.ingestionPipelineJobs?.length ?? 0,
      });
    }
  }, [d]);

  /** After a failed run, default the screener dropdown to the same screener (until the user picks another). */
  useEffect(() => {
    if (!d?.lastRun || !screeningFailed(d.lastRun.status)) return;
    if (screenerId !== "") return;
    const id = d.lastRun.screenerId?.trim();
    if (id && screeners.some((s) => s.id === id)) {
      setScreenerId(id);
    }
  }, [d?.lastRun, screenerId, screeners]);

  if (q.isLoading) {
    return (
      <div
        className="text-muted-foreground bg-muted/20 flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none" />
        <span>Loading workspace…</span>
      </div>
    );
  }

  if (q.error || !d) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-lg">
        <AlertCircle className="size-4" />
        <AlertTitle>Could not load deal</AlertTitle>
        <AlertDescription>
          {q.error?.message ??
            "Check widget auth and retry, or contact your administrator."}
        </AlertDescription>
      </Alert>
    );
  }

  const vectorWaitSec = Math.round(d.vectorSettleMsAfterIngest / 1000);

  return (
    <>
      <AlertDialog
        open={documentToDelete != null}
        onOpenChange={(open) => {
          if (!open) setDocumentToDelete(null);
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file from the deal?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground space-y-2 text-sm">
                <p>
                  This permanently removes{" "}
                  <span className="text-foreground font-medium">
                    {documentToDelete?.fileName ?? "this file"}
                  </span>{" "}
                  for this deal: stored file, database record, all ingested text
                  chunks, and matching vectors in the vector search index.
                  Related records that reference this document may also be
                  removed by the database. This cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDealDocument.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteDealDocument.isPending || !documentToDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (!documentToDelete) return;
                deleteDealDocument.mutate({
                  ...widgetInput,
                  documentId: documentToDelete.id,
                });
              }}
            >
              {deleteDealDocument.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog>
        <div className="bg-background text-foreground mx-auto max-w-3xl border-x px-3 py-4 md:px-5 md:py-5">
          <header className="border-border/80 space-y-3 border-b pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-muted-foreground text-[10px] font-medium tracking-[0.16em] uppercase">
                  Opportunity screening
                </p>
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                  Deal screening
                </h1>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer gap-1.5 text-[13px]"
                  >
                    <Info className="size-3.5 shrink-0" aria-hidden />
                    Deal context
                  </Button>
                </DialogTrigger>
                {run.isPending ? (
                  <Badge variant="secondary" className="gap-1.5 py-1">
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                    Preparing…
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
              <span>Bitrix #{d.bitrixDealId}</span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span>App {d.appDeal.id}</span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <span className={cn(indexed && "text-foreground font-medium")}>
                {d.indexedCount} chunk{d.indexedCount === 1 ? "" : "s"} indexed
              </span>
            </div>
            <WizardStepNav
              step={wizardStep}
              onStepChange={goWizardStep}
              canOpenStep2={canOpenStep2}
            />
          </header>

          <div className="py-4 md:py-5">
            {wizardStep === 1 ? (
              <section
                aria-labelledby="step-ingest-title"
                className="space-y-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FileStack
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden
                    />
                    <h2
                      id="step-ingest-title"
                      className="text-base font-semibold tracking-tight"
                    >
                      Step 1 — Ingest documents
                    </h2>
                  </div>
                  <p className="text-muted-foreground max-w-prose text-[13px] leading-snug">
                    Upload PDFs or other files for this deal. Duplicate content
                    is skipped. When you start screening, the server waits{" "}
                    {vectorWaitSec}s so the vector index can settle.
                  </p>
                </div>

                {indexed ? (
                  <div className="bg-muted/40 border-border/80 flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[13px] leading-snug">
                      <span className="text-foreground font-medium">
                        Search index ready.
                      </span>{" "}
                      {d.indexedCount} chunk{d.indexedCount === 1 ? "" : "s"}{" "}
                      available. Continue to choose a screener, or add more
                      files here.
                    </p>
                    <Button
                      type="button"
                      className="shrink-0 cursor-pointer"
                      onClick={() => goWizardStep(2)}
                    >
                      Continue to screener
                    </Button>
                  </div>
                ) : null}

                {displayIngestionPipelineJobs.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                      In progress
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      One line per file: upload to storage, then vector indexing.
                    </p>
                    <ul className="divide-border border-border divide-y rounded-md border">
                      {displayIngestionPipelineJobs.map((row) => (
                        <li
                          key={row.key}
                          className="bg-muted/20 space-y-1.5 px-2.5 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="min-w-0 font-medium wrap-break-word">
                              {row.fileName ?? "—"}
                            </span>
                            <span className="text-muted-foreground shrink-0 font-medium">
                              {row.phaseLabel}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                            <Loader2
                              className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                              aria-hidden
                            />
                            <span>{row.progressStep}</span>
                            <span className="font-mono text-[10px] tabular-nums">
                              {row.progressPercent}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(
                              100,
                              Math.max(0, row.progressPercent),
                            )}
                            className="h-1"
                            aria-label={`${row.fileName ?? "file"} ${row.phaseLabel}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {ingestSummary && ingestSummary.total > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-foreground font-medium">
                        File indexing
                      </span>
                      {ingestSummary.inFlight > 0 ? (
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <Loader2
                            className="size-3 animate-spin motion-reduce:animate-none"
                            aria-hidden
                          />
                          {ingestSummary.finishedPipeline} of{" "}
                          {ingestSummary.total} finished
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {ingestSummary.finishedPipeline} of{" "}
                          {ingestSummary.total} finished
                        </span>
                      )}
                    </div>
                    <Progress
                      value={ingestSummary.pct}
                      className="h-1"
                      aria-label="Document indexing progress"
                    />
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {ingestSummary.inFlight > 0
                        ? "Large files can take a few minutes. This view refreshes until each file is indexed."
                        : ingestSummary.failed > 0
                          ? "Some files failed — fix or re-upload those. Others may still be usable."
                          : "All current uploads finished ingestion."}
                    </p>
                    {ingestSummary.inFlight === 0 &&
                    !indexed &&
                    ingestSummary.total > 0 &&
                    ingestSummary.failed === ingestSummary.total ? (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle aria-hidden />
                        <AlertTitle>Nothing indexed yet</AlertTitle>
                        <AlertDescription className="text-xs">
                          Every file failed or was skipped without searchable
                          chunks. Try another format or re-upload.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Upload at least one file to begin indexing.
                  </p>
                )}

                {d.dealDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No files on this deal yet.
                  </p>
                ) : (
                  <ul className="divide-border border-border divide-y rounded-md border">
                    {d.dealDocuments.map((doc: DealDocumentRow) => (
                      <li
                        key={doc.id}
                        className={cn(
                          "flex flex-wrap items-start justify-between gap-2 px-2 py-1.5 text-xs",
                          doc.ingestionStatus === "PROCESSED" &&
                            "bg-emerald-500/4",
                          doc.ingestionStatus === "FAILED" &&
                            "bg-destructive/4",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <DocumentStatusIcon status={doc.ingestionStatus} />
                            <span className="font-medium wrap-break-word">
                              {doc.fileName}
                            </span>
                          </div>
                          {doc.ingestionError ? (
                            <p className="text-destructive mt-1.5 text-[11px] whitespace-pre-wrap">
                              {doc.ingestionError}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span
                            className={cn(
                              "font-medium",
                              doc.ingestionStatus === "PROCESSED" &&
                                "text-emerald-700 dark:text-emerald-400",
                              INGEST_IN_FLIGHT.has(doc.ingestionStatus) &&
                                "text-muted-foreground",
                              doc.ingestionStatus === "FAILED" &&
                                "text-destructive",
                            )}
                          >
                            {ingestionStatusLabel(doc.ingestionStatus)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive size-8 cursor-pointer"
                            disabled={deleteDealDocument.isPending}
                            aria-label={`Delete ${doc.fileName}`}
                            onClick={() => setDocumentToDelete(doc)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2 border-t border-dashed pt-3">
                  <Label htmlFor="bitrix-widget-upload" className="text-[13px]">
                    Add files
                  </Label>
                  <p className="text-muted-foreground text-[11px] leading-snug">
                    You can select multiple files in one dialog. New picks are
                    added to the list below (duplicates by name, size, and
                    modified time are merged).
                  </p>
                  <input
                    id="bitrix-widget-upload"
                    type="file"
                    multiple
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      setUploadFiles((prev) => {
                        const next = new Map<string, File>();
                        for (const f of prev) {
                          next.set(pendingUploadKey(f), f);
                        }
                        for (const f of picked) {
                          next.set(pendingUploadKey(f), f);
                        }
                        return Array.from(next.values());
                      });
                      e.target.value = "";
                    }}
                    className="file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                  {uploadFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-foreground text-[11px] font-medium tracking-wide uppercase">
                        Ready to upload ({uploadFiles.length})
                      </p>
                      <ul className="divide-border border-border divide-y rounded-md border">
                        {uploadFiles.map((file) => {
                          const key = pendingUploadKey(file);
                          const ext = fileExtensionFromName(file.name);
                          return (
                            <li
                              key={key}
                              className="bg-muted/15 flex flex-wrap items-center justify-between gap-2 px-2 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <FileStack
                                    className="text-muted-foreground size-3.5 shrink-0"
                                    aria-hidden
                                  />
                                  <span className="font-medium wrap-break-word">
                                    {file.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="h-5 shrink-0 px-1.5 font-mono text-[10px] font-normal"
                                  >
                                    {ext === "—" ? "no ext" : `.${ext}`}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground pl-[1.375rem] font-mono text-[10px] tabular-nums">
                                  {formatFileSizeBytes(file.size)}
                                  {file.type ? <> · {file.type}</> : null}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive size-8 shrink-0 cursor-pointer"
                                disabled={upload.isPending}
                                onClick={() => removePendingUpload(key)}
                                aria-label={`Remove ${file.name} from upload list`}
                              >
                                <X className="size-4" aria-hidden />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={uploadFiles.length === 0 || upload.isPending}
                    className="cursor-pointer"
                    onClick={() => void handleUpload()}
                  >
                    {upload.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    Upload
                    {uploadFiles.length > 0 ? ` (${uploadFiles.length})` : ""}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <span className="text-muted-foreground text-[11px]">
                    Step 1 of 3
                  </span>
                  <Button
                    type="button"
                    className="cursor-pointer"
                    disabled={!canOpenStep2}
                    onClick={() => goWizardStep(2)}
                  >
                    Next: Screener
                  </Button>
                </div>
                {!canOpenStep2 ? (
                  <p className="text-muted-foreground text-xs">
                    Next unlocks when at least one chunk is indexed.
                  </p>
                ) : null}
              </section>
            ) : null}

            {wizardStep === 2 ? (
              <section
                aria-labelledby="step-screener-title"
                className="space-y-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Play
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden
                    />
                    <h2
                      id="step-screener-title"
                      className="text-base font-semibold tracking-tight"
                    >
                      Step 2 — Run screening
                    </h2>
                  </div>
                  <p className="text-muted-foreground max-w-prose text-[13px] leading-snug">
                    Pick the screener template, then start. Uses{" "}
                    {d.indexedCount} indexed chunk
                    {d.indexedCount === 1 ? "" : "s"}. The server waits{" "}
                    {vectorWaitSec}s for the vector index after you start.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bitrix-widget-screener">Screener</Label>
                  <Select
                    value={effectiveScreenerId}
                    onValueChange={setScreenerId}
                  >
                    <SelectTrigger
                      id="bitrix-widget-screener"
                      className="cursor-pointer"
                    >
                      <SelectValue placeholder="Choose screener" />
                    </SelectTrigger>
                    <SelectContent>
                      {screeners.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    disabled={!canRun}
                    className="cursor-pointer"
                    onClick={handleStartScreening}
                  >
                    {run.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Play className="mr-2 size-4" />
                    )}
                    Start screening
                  </Button>
                  <p
                    className={
                      canRun
                        ? "text-muted-foreground text-xs leading-relaxed"
                        : "text-destructive text-sm leading-relaxed"
                    }
                    role="status"
                  >
                    {canRun ? "Ready to run." : (runBlocked ?? "")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => goWizardStep(1)}
                  >
                    Back
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => goWizardStep(3)}
                    >
                      View results
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}

            {wizardStep === 3 ? (
              <section
                aria-labelledby="step-results-title"
                className="space-y-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <History
                      className="text-muted-foreground size-3.5 shrink-0"
                      aria-hidden
                    />
                    <h2
                      id="step-results-title"
                      className="text-base font-semibold tracking-tight"
                    >
                      Step 3 — Results
                    </h2>
                  </div>
                  <p className="text-muted-foreground max-w-prose text-[13px] leading-snug">
                    Choose a screening run to review scores and rationale.
                    Latest run loads by default.
                  </p>
                </div>

                {d.activeJobs.length > 0 ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Workflow running ({d.activeJobs.length} job
                    {d.activeJobs.length > 1 ? "s" : ""})…
                  </div>
                ) : null}

                {!d.lastRun ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    No screening runs yet. Go to step 2 to start one.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {d.recentScreeningRuns.length > 1 ? (
                      <div className="space-y-1">
                        <Label htmlFor="bitrix-widget-view-run">
                          Screening run
                        </Label>
                        <Select
                          value={effectiveViewRunId ?? ""}
                          onValueChange={(value) => {
                            if (value === d.lastRun?.runId) setViewRunId(null);
                            else setViewRunId(value);
                          }}
                        >
                          <SelectTrigger
                            id="bitrix-widget-view-run"
                            className="cursor-pointer"
                          >
                            <SelectValue placeholder="Choose run" />
                          </SelectTrigger>
                          <SelectContent>
                            {d.recentScreeningRuns.map((r) => (
                              <SelectItem key={r.runId} value={r.runId}>
                                {new Date(r.createdAt).toLocaleString()} ·{" "}
                                {r.screenerName ?? "Screener"} · {r.status}
                                {r.runId === latestRunId ? " (latest)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}

                    {runDetailQuery.isError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Could not load run</AlertTitle>
                        <AlertDescription>
                          {runDetailQuery.error?.message ??
                            "Try again or pick another run."}
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {viewingRunDetailLoading ? (
                      <div
                        className="text-muted-foreground flex items-center gap-2 text-sm"
                        role="status"
                      >
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                        Loading run…
                      </div>
                    ) : displayRun ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="text-[13px] leading-snug">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-muted-foreground">
                                Status
                              </span>
                              <Badge
                                variant="secondary"
                                className="font-medium"
                              >
                                {displayRun.status}
                              </Badge>
                            </div>
                            {displayRun.screenerName ? (
                              <p className="text-muted-foreground mt-1 text-[13px]">
                                <span className="text-foreground font-medium">
                                  Screener:
                                </span>{" "}
                                {displayRun.screenerName}
                              </p>
                            ) : null}
                            <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                              {new Date(displayRun.createdAt).toLocaleString()}
                            </p>
                            {displayRun.errorMessage ? (
                              <p className="text-destructive mt-2 text-xs whitespace-pre-wrap">
                                {displayRun.errorMessage}
                              </p>
                            ) : null}
                            {screeningFailed(displayRun.status) ? (
                              <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="cursor-pointer"
                                  disabled={!canRun || run.isPending}
                                  onClick={handleStartScreening}
                                >
                                  {run.isPending ? (
                                    <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
                                  ) : (
                                    <RefreshCw
                                      className="mr-2 size-4"
                                      aria-hidden
                                    />
                                  )}
                                  Retry screening
                                </Button>
                                <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
                                  Starts a new run from step 2 (same vector
                                  wait). Change the screener there if needed.
                                </p>
                              </div>
                            ) : null}
                          </div>
                          {orderedScreeningAnswers.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="h-fit shrink-0 gap-1.5 self-start py-1.5 font-mono text-[11px]"
                            >
                              {orderedScreeningAnswers.length} question
                              {orderedScreeningAnswers.length === 1 ? "" : "s"}
                              <span className="text-muted-foreground font-sans font-normal">
                                · order
                              </span>
                            </Badge>
                          ) : null}
                        </div>

                        {orderedScreeningAnswers.length === 0 ? (
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {screeningStillRunning(displayRun.status)
                              ? "Answers appear when screening completes."
                              : "No answers stored for this run."}
                          </p>
                        ) : (
                          <ScrollArea className="h-[min(62vh,680px)] pr-2">
                            <ol className="m-0 list-none p-0 pb-1">
                              {orderedScreeningAnswers.map((a, idx) => (
                                <ScreeningResultQuestionItem
                                  key={a.questionId}
                                  answer={a}
                                  displayIndex={idx + 1}
                                  totalQuestions={
                                    orderedScreeningAnswers.length
                                  }
                                />
                              ))}
                            </ol>
                          </ScrollArea>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => goWizardStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => goWizardStep(1)}
                  >
                    Documents
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-border/80 shrink-0 space-y-1 border-b px-6 py-4 text-left">
            <DialogTitle className="text-base">Deal context</DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              Workspace summary, linked Bitrix CRM records, and non-empty deal
              fields from <code className="font-mono">crm.deal.get</code>{" "}
              (attachments omitted).
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="text-muted-foreground size-4" aria-hidden />
                <h3 className="text-sm font-semibold">Workspace</h3>
              </div>
              <div className="grid gap-1.5 text-sm">
                <SummaryRow label="Title" value={d.appDeal.title ?? "—"} />
                <SummaryRow label="Stage" value={d.appDeal.stage ?? "—"} />
              </div>
              <Link
                to="/deal-opportunities/$uid"
                params={{ uid: d.appDeal.id }}
                className="text-primary inline-flex cursor-pointer items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                Open in app
                <ExternalLink className="size-3.5" aria-hidden />
              </Link>
            </div>

            {d.bitrixLinkedContact || d.bitrixLinkedCompany ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2
                    className="text-muted-foreground size-4"
                    aria-hidden
                  />
                  <h3 className="text-sm font-semibold">Bitrix CRM</h3>
                </div>
                {d.bitrixLinkedCompany ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{d.bitrixLinkedCompany.title}</p>
                    {d.bitrixLinkedCompany.industry ? (
                      <p className="text-muted-foreground text-xs">
                        {d.bitrixLinkedCompany.industry}
                      </p>
                    ) : null}
                    {d.bitrixLinkedCompany.email ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Email </span>
                        {d.bitrixLinkedCompany.email}
                      </p>
                    ) : null}
                    {d.bitrixLinkedCompany.phones ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Phone </span>
                        {d.bitrixLinkedCompany.phones}
                      </p>
                    ) : null}
                    {d.bitrixLinkedCompany.website ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Web </span>
                        {d.bitrixLinkedCompany.website}
                      </p>
                    ) : null}
                    {d.portalBaseUrl ? (
                      <a
                        href={`${d.portalBaseUrl.replace(/\/+$/, "")}/crm/company/details/${d.bitrixLinkedCompany.id}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                      >
                        Company in Bitrix
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {d.bitrixLinkedContact ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {d.bitrixLinkedContact.displayName}
                      </p>
                      <User
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                    </div>
                    {d.bitrixLinkedContact.email ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Email </span>
                        {d.bitrixLinkedContact.email}
                      </p>
                    ) : null}
                    {d.bitrixLinkedContact.phones ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Phone </span>
                        {d.bitrixLinkedContact.phones}
                      </p>
                    ) : null}
                    {d.portalBaseUrl ? (
                      <a
                        href={`${d.portalBaseUrl.replace(/\/+$/, "")}/crm/contact/details/${d.bitrixLinkedContact.id}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                      >
                        Contact in Bitrix
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Bitrix deal fields</h3>
              <div className="border-border max-h-[min(40vh,360px)] overflow-auto border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="border-border border-b px-2 py-1.5 font-semibold">
                        Label
                      </th>
                      <th className="border-border border-b px-2 py-1.5 font-semibold">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.bitrixDealFields.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-muted-foreground px-2 py-3 text-center"
                        >
                          No Bitrix payload.
                        </td>
                      </tr>
                    ) : bitrixFilledFields.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-muted-foreground px-2 py-3 text-center"
                        >
                          No non-empty fields.
                        </td>
                      </tr>
                    ) : (
                      bitrixFilledFields.map((row) => (
                        <tr
                          key={row.key}
                          className="border-border/60 border-b last:border-0"
                        >
                          <td className="text-foreground w-[min(40%,200px)] px-2 py-1.5 align-top font-medium">
                            {row.label}
                          </td>
                          <td className="max-w-[min(55vw,320px)] px-2 py-1.5 wrap-break-word whitespace-pre-wrap">
                            {row.value}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
