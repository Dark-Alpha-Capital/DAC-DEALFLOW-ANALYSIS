import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookMarked,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  FileStack,
  History,
  Layers,
  ListChecks,
  Loader2,
  Play,
  RefreshCw,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EvidenceCitation } from "@/lib/map-cim-screening-evidence";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DealOpportunityWorkflowStepper,
  type DealOpportunityWorkflowStepId,
} from "@/components/deal-opportunities/deal-opportunity-workflow-stepper";
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
          "group border-border/70 bg-muted/30 flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200",
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
        <div className="border-border/60 bg-background/70 mt-2 max-h-72 overflow-y-auto rounded-lg border p-3 shadow-inner">
          {citations.length > 0 ? (
            <ol className="marker:text-muted-foreground list-decimal space-y-4 pl-4 text-xs leading-relaxed wrap-anywhere">
              {citations.map((c, idx) => (
                <li key={`${c.chunkId}-${idx}`} className="pl-1">
                  <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium tracking-wide uppercase">
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
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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

type WidgetBootstrap =
  inferRouterOutputs<AppRouter>["dealOpportunities"]["getBitrixScreeningWidgetContext"];

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
  return (
    <li className="border-border/60 border-b pb-6 last:border-b-0 last:pb-0">
      <article className="flex gap-3 sm:gap-4">
        <div
          className="flex w-10 shrink-0 flex-col items-center sm:w-11"
          aria-hidden
        >
          <span
            className={cn(
              "border-border/80 bg-muted/60 text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular-nums shadow-xs",
              "sm:size-10 sm:text-sm",
            )}
          >
            {displayIndex}
          </span>
          <span className="text-muted-foreground mt-1.5 hidden text-[10px] font-medium sm:block">
            / {totalQuestions}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="border-border/40 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-muted-foreground font-mono text-[10px] font-semibold tracking-widest uppercase">
                Question {displayIndex} of {totalQuestions}
              </p>
              <h3 className="text-foreground max-w-prose text-[0.9375rem] leading-snug font-semibold tracking-tight text-pretty sm:text-base">
                {answer.question}
              </h3>
            </div>
            <div
              className={cn(
                "border-primary/20 bg-primary/8 flex shrink-0 flex-col items-end gap-0.5 rounded-lg border px-3 py-2 text-right",
                "min-w-[4.5rem]",
              )}
              aria-label={`Score ${answer.score ?? "—"} out of 10`}
            >
              <span className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                Score
              </span>
              <span className="text-foreground font-mono text-xl leading-none font-bold tabular-nums sm:text-2xl">
                {answer.score ?? "—"}
              </span>
            </div>
          </div>

          <div className="bg-muted/25 border-border/60 rounded-lg border px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="text-muted-foreground mb-2 text-[0.65rem] font-semibold tracking-wide uppercase">
              Rationale
            </p>
            <p className="text-foreground max-w-prose text-sm leading-relaxed whitespace-pre-wrap">
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
    return "Upload or indexing workflow still running — see Pipeline progress on the Documents step.";
  }
  if (ingestBusy) {
    return "File ingestion still in progress. Wait until documents show as processed (Documents step).";
  }
  if (!indexed) {
    return "Upload at least one document on the Documents step and wait until it is indexed (chunks > 0).";
  }
  return null;
}

function WorkspaceCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-border/80 bg-card/95 shadow-xs backdrop-blur-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none",
        className,
      )}
    >
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-start gap-2.5">
          {Icon ? (
            <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="font-serif text-base tracking-tight">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="text-xs leading-relaxed">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
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

const SCREENING_WORKFLOW_STEPS: {
  step: DealOpportunityWorkflowStepId;
  label: string;
  description: string;
  icon: typeof FileStack;
}[] = [
  {
    step: 1,
    label: "Documents",
    description: "Upload & indexing",
    icon: FileStack,
  },
  {
    step: 2,
    label: "Run screening",
    description: "Screener & start",
    icon: Play,
  },
  {
    step: 3,
    label: "Results",
    description: "Answers & history",
    icon: ListChecks,
  },
];

export function BitrixScreeningWidgetWorkspace({
  dealId,
  memberId,
  expiresAt,
  authSig,
  authId,
  appSid,
  domain,
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

  const [screenerId, setScreenerId] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  /** `null` = show the latest run from bootstrap (refetches with polling). Set to a past `runId` to load that run’s answers. */
  const [viewRunId, setViewRunId] = useState<string | null>(null);

  const [workflowStep, setWorkflowStep] =
    useState<DealOpportunityWorkflowStepId>(1);
  const screeningWorkflowInitialized = useRef(false);

  const q = useQuery({
    ...trpc.dealOpportunities.getBitrixScreeningWidgetContext.queryOptions(
      widgetInput,
    ),
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
        setWorkflowStep(3);
        toast.success(
          `Screening started (waited ${Math.round((q.data?.vectorSettleMsAfterIngest ?? 12_000) / 1000)}s for vector index)`,
        );
        void q.refetch();
      },
      onError: (e) => toast.error(e.message || "Could not start screening"),
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

  useEffect(() => {
    if (!d || screeningWorkflowInitialized.current) return;
    screeningWorkflowInitialized.current = true;
    setWorkflowStep((d.indexedCount ?? 0) > 0 ? 2 : 1);
  }, [d]);

  useEffect(() => {
    if (!d) return;
    if (!indexed) {
      const hasAnyRun =
        d.lastRun != null || d.recentScreeningRuns.length > 0;
      if (!hasAnyRun && workflowStep !== 1) setWorkflowStep(1);
    }
  }, [d, indexed, workflowStep]);

  const canNavigateToScreeningStep = useCallback(
    (target: DealOpportunityWorkflowStepId) => {
      if (!d) return target === 1;
      if (target === 1) return true;
      if (target === 2) return true;
      return (
        d.recentScreeningRuns.length > 0 ||
        d.activeJobs.length > 0 ||
        d.lastRun != null
      );
    },
    [d],
  );

  const screeningStepDisabledTitle = useCallback(
    (target: DealOpportunityWorkflowStepId) => {
      if (canNavigateToScreeningStep(target)) return undefined;
      return "Start a screening or wait until a run exists to open Results.";
    },
    [canNavigateToScreeningStep],
  );

  if (q.isLoading) {
    return (
      <div
        className="text-muted-foreground bg-muted/20 flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-sm"
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

  const canContinueFromDocuments = indexed && !ingestBusy;

  return (
    <div className="border-border/70 from-muted/25 via-background to-background relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-2xl border bg-gradient-to-b shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(900px_circle_at_0%_-20%,oklch(0.6231_0.188_259.8_/_0.12),transparent_55%),radial-gradient(700px_circle_at_100%_0%,oklch(0.55_0.06_250_/_0.08),transparent_50%)] opacity-[0.45] motion-reduce:opacity-25"
        aria-hidden
      />
      <div className="relative space-y-4 p-4 md:space-y-5 md:p-6">
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4">
          <header className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-widest uppercase">
                  Opportunity screening
                </p>
                <h1 className="text-foreground font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  Deal screening
                </h1>
              </div>
              {run.isPending ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1.5 py-1.5 pr-2.5 pl-2"
                >
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  Preparing…
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 font-mono text-[11px]"
              >
                Bitrix #{d.bitrixDealId}
              </Badge>
              <Badge
                variant="outline"
                className="gap-1.5 font-mono text-[11px]"
              >
                App {d.appDeal.id}
              </Badge>
              <Badge
                variant={indexed ? "default" : "secondary"}
                className="gap-1.5"
              >
                <Layers className="size-3.5" aria-hidden />
                {d.indexedCount} chunk{d.indexedCount === 1 ? "" : "s"}
              </Badge>
            </div>
            <Separator className="bg-border/80" />
          </header>

          <DealOpportunityWorkflowStepper
            steps={SCREENING_WORKFLOW_STEPS}
            current={workflowStep}
            onStepChange={setWorkflowStep}
            canNavigateTo={canNavigateToScreeningStep}
            stepDisabledTitle={screeningStepDisabledTitle}
          />

          {d.recentScreeningRuns.length > 0 && workflowStep !== 3 ? (
            <Alert className="border-primary/25 bg-primary/[0.04] py-3 [&>svg]:top-3.5 [&>svg+div]:translate-y-0">
              <History className="size-4" aria-hidden />
              <AlertTitle className="text-sm">Previous screenings</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                <span className="text-muted-foreground block sm:inline sm:pr-2">
                  You have saved runs — open Results to review or compare.
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2 cursor-pointer sm:mt-0"
                  onClick={() => setWorkflowStep(3)}
                >
                  View results
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {workflowStep === 1 ? (
          <WorkspaceCard
            title="Documents for screening"
            icon={FileStack}
            description={`Upload PDFs or other files to ingest into search. Duplicate content hashes are skipped. After a run starts, the server waits ${vectorWaitSec}s so Cloudflare Vectorize can serve fresh embeddings.`}
          >
            {(d.ingestionPipelineJobs?.length ?? 0) > 0 ? (
              <div className="border-primary/25 bg-primary/[0.06] mb-5 space-y-3 rounded-xl border p-4">
                <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                  Pipeline progress
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Files appear after they are saved to the app. While{" "}
                  <strong className="text-foreground">Upload & save</strong>{" "}
                  runs, steps show here first, then{" "}
                  <strong className="text-foreground">Index for search</strong>.
                </p>
                <ul className="space-y-3">
                  {(d.ingestionPipelineJobs ?? []).map((job) => (
                    <li
                      key={job.instanceId}
                      className="bg-card/90 border-border/60 space-y-2 rounded-lg border px-3 py-2.5 text-xs shadow-xs"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="min-w-0 font-medium wrap-break-word">
                          {job.fileName ?? "—"}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[11px] font-medium">
                          {pipelineKindLabel(job.workflowKind)}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
                        <Loader2
                          className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                          aria-hidden
                        />
                        <span>
                          {job.progressStep?.trim() ||
                            (job.state === "waiting" ? "Starting…" : job.state)}
                        </span>
                        <span className="text-muted-foreground/90 font-mono text-[10px]">
                          {job.progressPercent}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, Math.max(0, job.progressPercent))}
                        className="h-1.5"
                        aria-label={`${job.fileName ?? "file"} ${pipelineKindLabel(job.workflowKind)}`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ingestSummary && ingestSummary.total > 0 ? (
              <div className="mb-5 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-foreground font-medium">
                    Indexing progress
                  </span>
                  {ingestSummary.inFlight > 0 ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <Loader2
                        className="size-3 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                      {ingestSummary.finishedPipeline} of {ingestSummary.total}{" "}
                      files finished
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {ingestSummary.finishedPipeline} of {ingestSummary.total}{" "}
                      files finished
                    </span>
                  )}
                </div>
                <Progress
                  value={ingestSummary.pct}
                  className="h-1.5"
                  aria-label="Document indexing progress"
                />
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {ingestSummary.inFlight > 0
                    ? "Large files can take a few minutes. This view refreshes until each file shows Indexed."
                    : ingestSummary.failed > 0
                      ? "Some files failed indexing — fix or re-upload those files. Others may still be usable if indexed."
                      : "All current uploads finished the ingestion pipeline."}
                </p>
                {ingestSummary.inFlight === 0 && indexed ? (
                  <Alert className="border-emerald-500/35 bg-emerald-500/[0.08] py-3 [&>svg]:top-3.5 [&>svg+div]:translate-y-0">
                    <CheckCircle2
                      className="text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    />
                    <AlertTitle className="text-emerald-950 dark:text-emerald-50">
                      Ready to screen
                    </AlertTitle>
                    <AlertDescription className="text-xs text-emerald-950/90 dark:text-emerald-50/90">
                      Documents are indexed ({d.indexedCount} chunk
                      {d.indexedCount === 1 ? "" : "s"}). Use{" "}
                      <strong className="font-semibold">Continue to screening</strong>{" "}
                      below, then start from the Run screening step.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {ingestSummary.inFlight === 0 &&
                !indexed &&
                ingestSummary.total > 0 &&
                ingestSummary.failed === ingestSummary.total ? (
                  <Alert
                    variant="destructive"
                    className="py-3 [&>svg]:top-3.5 [&>svg+div]:translate-y-0"
                  >
                    <AlertCircle aria-hidden />
                    <AlertTitle>Nothing indexed yet</AlertTitle>
                    <AlertDescription className="text-xs">
                      Every file failed or was skipped without searchable
                      chunks. Try re-uploading or another format.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
                Upload at least one file below to begin indexing.
              </p>
            )}

            {d.dealDocuments.length === 0 ? (
              <p className="text-muted-foreground mb-4 text-sm">
                No uploads yet for this deal workspace.
              </p>
            ) : (
              <ul className="mb-4 space-y-2 text-sm">
                {d.dealDocuments.map((doc: DealDocumentRow) => (
                  <li
                    key={doc.id}
                    className={cn(
                      "border-border/70 bg-muted/15 flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                      doc.ingestionStatus === "PROCESSED" &&
                        "border-emerald-500/25 bg-emerald-500/[0.04]",
                      doc.ingestionStatus === "FAILED" &&
                        "border-destructive/30 bg-destructive/[0.04]",
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
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        doc.ingestionStatus === "PROCESSED" &&
                          "text-emerald-700 dark:text-emerald-400",
                        INGEST_IN_FLIGHT.has(doc.ingestionStatus) &&
                          "text-muted-foreground",
                        doc.ingestionStatus === "FAILED" && "text-destructive",
                      )}
                    >
                      {ingestionStatusLabel(doc.ingestionStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-border/90 bg-muted/20 hover:border-primary/30 hover:bg-muted/30 space-y-3 rounded-xl border border-dashed p-4 transition-colors">
              <Label htmlFor="bitrix-widget-upload" className="text-sm">
                Upload files
              </Label>
              <input
                id="bitrix-widget-upload"
                type="file"
                multiple
                onChange={(e) =>
                  setUploadFiles(Array.from(e.target.files ?? []))
                }
                className="file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              />
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
                Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}
              </Button>
            </div>

            <div className="border-border/80 mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs leading-relaxed sm:max-w-md">
                {canContinueFromDocuments
                  ? "Indexed chunks are ready. Continue to pick a screener and start screening."
                  : "Wait until indexing finishes and chunk count is above zero, then continue."}
              </p>
              <Button
                type="button"
                className="cursor-pointer shrink-0"
                disabled={!canContinueFromDocuments}
                onClick={() => setWorkflowStep(2)}
              >
                Continue to screening
              </Button>
            </div>
          </WorkspaceCard>
          ) : workflowStep === 2 ? (
          <div className="space-y-4">
          <WorkspaceCard title="Run screening" icon={Play}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bitrix-widget-screener">Screener</Label>
                <Select
                  value={effectiveScreenerId}
                  onValueChange={setScreenerId}
                >
                  <SelectTrigger
                    id="bitrix-widget-screener"
                    className="mt-1.5 cursor-pointer"
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
                  {canRun
                    ? `Ready when you are. Uses ${d.indexedCount} indexed chunk${d.indexedCount === 1 ? "" : "s"}. On start, the server waits ${vectorWaitSec}s for the vector index.`
                    : (runBlocked ?? "")}
                </p>
              </div>
            </div>
          </WorkspaceCard>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() => setWorkflowStep(1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to documents
          </Button>
          </div>
          ) : (
          <div className="space-y-5">
          <WorkspaceCard
            title="Screening history"
            icon={History}
            description="Click a run to load its answers below."
          >
            {d.recentScreeningRuns.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {d.recentScreeningRuns.map((r) => (
                  <li
                    key={r.runId}
                    className={cn(
                      "space-y-2 rounded-lg border px-3 py-2.5 text-xs transition-colors",
                      effectiveViewRunId === r.runId
                        ? "border-primary/50 bg-primary/[0.07] ring-primary/25 ring-1"
                        : "border-border/70 bg-muted/10 hover:bg-muted/20",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full cursor-pointer text-left"
                      onClick={() => {
                        setWorkflowStep(3);
                        const isLatest = r.runId === d.lastRun?.runId;
                        setViewRunId(isLatest ? null : r.runId);
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="font-semibold">{r.status}</span>
                          {r.screenerName ? (
                            <span className="text-muted-foreground">
                              {r.screenerName}
                            </span>
                          ) : null}
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {effectiveViewRunId === r.runId ? (
                          <span className="text-primary shrink-0 text-[10px] font-semibold tracking-wide uppercase">
                            Showing
                          </span>
                        ) : null}
                      </div>
                    </button>
                    {r.documentsAtRun.length > 0 ? (
                      <div className="text-muted-foreground text-[11px] leading-relaxed">
                        <span className="text-foreground font-medium">
                          Files in this run:
                        </span>{" "}
                        {r.documentsAtRun.map((x) => x.fileName).join(", ")}
                      </div>
                    ) : null}
                    {r.errorMessage ? (
                      <span className="text-destructive block whitespace-pre-wrap">
                        {r.errorMessage}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </WorkspaceCard>

          <WorkspaceCard
            title="Screening result"
            className="border-primary/15 bg-card/90 min-h-[240px] shadow-md backdrop-blur-md"
          >
            {d.activeJobs.length > 0 ? (
              <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                Workflow running ({d.activeJobs.length} job
                {d.activeJobs.length > 1 ? "s" : ""})…
              </div>
            ) : null}

            {!d.lastRun ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                No screening run yet for this opportunity.
              </p>
            ) : (
              <div className="space-y-5">
                {d.recentScreeningRuns.length > 1 ? (
                  <div>
                    <Label htmlFor="bitrix-widget-view-run">Viewing run</Label>
                    <Select
                      value={effectiveViewRunId ?? ""}
                      onValueChange={(value) => {
                        if (value === d.lastRun?.runId) setViewRunId(null);
                        else setViewRunId(value);
                      }}
                    >
                      <SelectTrigger
                        id="bitrix-widget-view-run"
                        className="mt-1.5 cursor-pointer"
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
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="text-sm leading-relaxed">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="secondary" className="font-medium">
                            {displayRun.status}
                          </Badge>
                        </div>
                        {displayRun.screenerName ? (
                          <p className="text-muted-foreground mt-2 text-sm">
                            <span className="text-foreground font-medium">
                              Screener:
                            </span>{" "}
                            {displayRun.screenerName}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-1 text-[11px] font-mono">
                          {new Date(displayRun.createdAt).toLocaleString()}
                        </p>
                        {displayRun.errorMessage ? (
                          <p className="text-destructive mt-3 text-xs whitespace-pre-wrap">
                            {displayRun.errorMessage}
                          </p>
                        ) : null}
                        {screeningFailed(displayRun.status) ? (
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
                                <RefreshCw className="mr-2 size-4" aria-hidden />
                              )}
                              Retry screening
                            </Button>
                            <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
                              Starts a new run with the same steps as{" "}
                              <strong className="text-foreground font-medium">
                                Start screening
                              </strong>{" "}
                              (including the vector wait). Go back to the Run
                              screening step to pick a different screener.
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
                            · screener order
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
                      <ScrollArea className="h-[min(70vh,800px)] pr-3">
                        <ol className="m-0 list-none p-0 pb-1">
                          {orderedScreeningAnswers.map((a, idx) => (
                            <ScreeningResultQuestionItem
                              key={a.questionId}
                              answer={a}
                              displayIndex={idx + 1}
                              totalQuestions={orderedScreeningAnswers.length}
                            />
                          ))}
                        </ol>
                      </ScrollArea>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </WorkspaceCard>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => setWorkflowStep(2)}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Back to run screening
            </Button>
          </div>
          </div>
          )}

          <Collapsible defaultOpen={false} className="border-border/80 bg-muted/15 w-full rounded-xl border">
            <CollapsibleTrigger
              type="button"
              className={cn(
                "group border-border/70 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
                "hover:bg-muted/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-background focus-visible:ring-offset-2 focus-visible:outline-none",
              )}
            >
              <span>Deal & Bitrix details</span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-border/60 data-[state=closed]:animate-out data-[state=open]:animate-in space-y-4 border-t px-4 pt-4 pb-4">
              {d.bitrixLinkedContact || d.bitrixLinkedCompany ? (
                <WorkspaceCard
                  title="Bitrix contact & company"
                  icon={Building2}
                  description="From CONTACT_ID / COMPANY_ID via REST."
                >
                  {d.bitrixLinkedCompany ? (
                    <div className="border-border/80 bg-muted/10 mb-4 space-y-2 rounded-lg border px-3 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold">
                          {d.bitrixLinkedCompany.title}
                        </div>
                        <Building2
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden
                        />
                      </div>
                      {d.bitrixLinkedCompany.industry ? (
                        <div className="text-muted-foreground text-xs">
                          {d.bitrixLinkedCompany.industry}
                        </div>
                      ) : null}
                      {d.bitrixLinkedCompany.email ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Email: </span>
                          {d.bitrixLinkedCompany.email}
                        </div>
                      ) : null}
                      {d.bitrixLinkedCompany.phones ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Phone: </span>
                          {d.bitrixLinkedCompany.phones}
                        </div>
                      ) : null}
                      {d.bitrixLinkedCompany.website ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Web: </span>
                          {d.bitrixLinkedCompany.website}
                        </div>
                      ) : null}
                      {d.portalBaseUrl ? (
                        <a
                          href={`${d.portalBaseUrl.replace(/\/+$/, "")}/crm/company/details/${d.bitrixLinkedCompany.id}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                        >
                          Open company in Bitrix
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {d.bitrixLinkedContact ? (
                    <div className="border-border/80 bg-muted/10 space-y-2 rounded-lg border px-3 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold">
                          {d.bitrixLinkedContact.displayName}
                        </div>
                        <User
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden
                        />
                      </div>
                      {d.bitrixLinkedContact.email ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Email: </span>
                          {d.bitrixLinkedContact.email}
                        </div>
                      ) : null}
                      {d.bitrixLinkedContact.phones ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Phone: </span>
                          {d.bitrixLinkedContact.phones}
                        </div>
                      ) : null}
                      {d.portalBaseUrl ? (
                        <a
                          href={`${d.portalBaseUrl.replace(/\/+$/, "")}/crm/contact/details/${d.bitrixLinkedContact.id}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                        >
                          Open contact in Bitrix
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </WorkspaceCard>
              ) : null}

              <WorkspaceCard title="Workspace opportunity" icon={Layers}>
                <div className="grid gap-2">
                  <SummaryRow label="Title" value={d.appDeal.title ?? "—"} />
                  <SummaryRow label="Stage" value={d.appDeal.stage ?? "—"} />
                </div>
                <Link
                  to="/deal-opportunities/$uid"
                  params={{ uid: d.appDeal.id }}
                  className="text-primary mt-4 inline-flex cursor-pointer items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  Open in app
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </WorkspaceCard>

              <WorkspaceCard
                title="Bitrix deal fields"
                description="Only fields with a value from crm.deal.get. File attachment fields are omitted."
              >
                <div className="border-border/70 max-h-[40vh] overflow-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 sticky top-0 backdrop-blur-sm">
                      <tr>
                        <th className="border-border/80 border-b px-3 py-2 font-semibold">
                          Label
                        </th>
                        <th className="border-border/80 border-b px-3 py-2 font-semibold">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.bitrixDealFields.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="text-muted-foreground px-3 py-4 text-center"
                          >
                            No Bitrix payload (webhook or deal fetch failed).
                          </td>
                        </tr>
                      ) : bitrixFilledFields.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2}
                            className="text-muted-foreground px-3 py-4 text-center"
                          >
                            No non-empty field values on this deal.
                          </td>
                        </tr>
                      ) : (
                        bitrixFilledFields.map((row) => (
                          <tr
                            key={row.key}
                            className="border-border/50 border-b last:border-0"
                          >
                            <td className="text-foreground w-[min(40%,200px)] px-3 py-2 align-top font-medium">
                              {row.label}
                            </td>
                            <td className="max-w-[min(55vw,320px)] px-3 py-2 wrap-break-word whitespace-pre-wrap">
                              {row.value}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </WorkspaceCard>
            </CollapsibleContent>
          </Collapsible>

        </div>
      </div>
    </div>
  );
}
