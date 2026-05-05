import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatIcScorerMemoPlainText,
  type IcScorerMemoStructured,
  type IcScorerOutputLoose,
} from "@repo/schemas";
import type {
  IcScorerBootstrapInput,
  IcScorerBootstrapPayload,
  IcScorerBootstrapPrefetchHint,
} from "@/lib/ic-scorer-bootstrap-types";
import { loadIcScorerBootstrapData } from "@/lib/server/load-ic-scorer-bootstrap";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DocumentListItem } from "./bitrix-screening-widget/document-list-item";
import { IngestionProgressList } from "./bitrix-screening-widget/ingestion-progress-list";
import { UploadQueue } from "./bitrix-screening-widget/upload-queue";
import type { DealDocumentRow } from "./bitrix-screening-widget/types";
import {
  INGEST_IN_FLIGHT,
  mergeIngestionPipelineJobsForDisplay,
  pendingUploadKey,
  summarizeIngestion,
  toBase64,
} from "./bitrix-screening-widget/utils";

type Props = {
  dealId: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
  loaderBootstrap?: IcScorerBootstrapPayload | null;
  loaderBootstrapInput?: IcScorerBootstrapInput | null;
  bootstrapPrefetchHint?: IcScorerBootstrapPrefetchHint;
};

type Step = 1 | 2 | 3;

function bootstrapInputsMatch(
  dealId: string,
  w: {
    memberId?: string;
    expiresAt?: number;
    authSig?: string;
    authId?: string;
    appSid?: string;
    domain?: string;
  },
  pref: IcScorerBootstrapInput | null | undefined,
): boolean {
  if (!pref || pref.dealId !== dealId) return false;
  return (
    pref.memberId === w.memberId &&
    pref.expiresAt === w.expiresAt &&
    pref.authSig === w.authSig &&
    pref.authId === w.authId &&
    pref.appSid === w.appSid &&
    pref.domain === w.domain
  );
}

const PRIORITY_KEYS = new Set([
  "TITLE",
  "STAGE_ID",
  "OPPORTUNITY",
  "CURRENCY_ID",
  "UF_CRM_DEAL_DESCRIPTION",
  "COMMENTS",
]);

function scoreColors(color: string | undefined) {
  if (color === "green")
    return {
      ring: "ring-emerald-500/40",
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      badge:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  if (color === "yellow")
    return {
      ring: "ring-amber-500/40",
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      badge:
        "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    };
  if (color === "red")
    return {
      ring: "ring-rose-500/40",
      text: "text-rose-700 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      badge:
        "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  return {
    ring: "ring-muted-foreground/20",
    text: "text-muted-foreground",
    bg: "bg-muted/30",
    badge: "border-border/50 bg-muted text-muted-foreground",
  };
}

function alignmentChip(status: string | undefined) {
  if (status === "pass")
    return {
      label: "Pass",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  if (status === "partial")
    return {
      label: "Partial",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    };
  if (status === "fail")
    return {
      label: "Fail",
      cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  return {
    label: "—",
    cls: "border-border/50 bg-muted text-muted-foreground",
  };
}

function MemoStructuredPreview({ memo }: { memo: IcScorerMemoStructured }) {
  return (
    <div className="border-border/80 space-y-4 rounded-xl border p-4 text-sm leading-relaxed">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
        IC memo
      </p>
      <p className="text-foreground font-medium">{memo.scoreHeadline}</p>
      <section>
        <h4 className="font-semibold">Investment thesis</h4>
        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
          {memo.investmentThesisMemo}
        </p>
      </section>
      {memo.alignmentMemos.length ? (
        <section>
          <h4 className="font-semibold">Alignment</h4>
          <ul className="divide-border/60 mt-1.5 divide-y">
            {memo.alignmentMemos.map((row, i) => (
              <li key={`${row.pillar}-${i}`} className="py-2 first:pt-0">
                <p className="font-medium">{row.pillar}</p>
                <p className="text-muted-foreground text-sm">{row.memo}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {memo.strengthBullets.length ? (
          <section>
            <h4 className="font-semibold">Strengths</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {memo.strengthBullets.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {memo.riskAndGapsMemo.length ? (
          <section>
            <h4 className="flex items-center gap-1 font-semibold">
              <TriangleAlert className="size-4 text-amber-500" aria-hidden />
              Risks &amp; gaps
            </h4>
            <ul className="mt-1 space-y-2">
              {memo.riskAndGapsMemo.map((r, i) => (
                <li key={i}>
                  <p className="font-medium">{r.risk}</p>
                  {r.suggestedAction ? (
                    <p className="text-muted-foreground text-xs">
                      → {r.suggestedAction}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {memo.recommendationMemo ? (
        <section>
          <h4 className="font-semibold">Recommendation</h4>
          <p className="mt-1 whitespace-pre-wrap">{memo.recommendationMemo}</p>
        </section>
      ) : null}
    </div>
  );
}

function RunOutputPreview({ o }: { o: IcScorerOutputLoose }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {o.investmentThesis ? (
        <section>
          <h4 className="text-foreground font-semibold">Investment thesis</h4>
          <p className="text-foreground mt-1 whitespace-pre-wrap">
            {o.investmentThesis}
          </p>
        </section>
      ) : null}
      {o.alignment?.length ? (
        <section>
          <h4 className="text-foreground font-semibold">Alignment</h4>
          <ul className="divide-border/60 mt-1.5 divide-y">
            {o.alignment.map((row, i) => {
              const ch = alignmentChip(row.status);
              return (
                <li
                  key={`${row.pillar}-${i}`}
                  className="flex justify-between gap-3 py-2 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{row.pillar}</p>
                    <p className="text-muted-foreground text-sm">{row.note}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 border", ch.cls)}
                  >
                    {ch.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {o.strengths?.length ? (
          <section>
            <h4 className="font-semibold">Strengths</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 marker:text-emerald-500">
              {o.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {o.risksAndGaps?.length ? (
          <section>
            <h4 className="flex items-center gap-1 font-semibold">
              <TriangleAlert className="size-4 text-amber-500" aria-hidden />
              Risks &amp; gaps
            </h4>
            <ul className="mt-1 space-y-2">
              {o.risksAndGaps.map((r, i) => (
                <li key={i}>
                  <p className="font-medium">{r.risk}</p>
                  {r.suggestedAction ? (
                    <p className="text-muted-foreground text-xs">
                      → {r.suggestedAction}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      {o.recommendation ? (
        <section>
          <h4 className="font-semibold">Recommendation</h4>
          <p className="mt-1">{o.recommendation}</p>
        </section>
      ) : null}
    </div>
  );
}

function icRunIsTerminal(status: string): boolean {
  return status === "COMPLETED" || status === "FAILED";
}

function StepTabs({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  const tabs: { s: Step; label: string }[] = [
    { s: 1, label: "Documents & mode" },
    { s: 2, label: "Score & memo" },
    { s: 3, label: "Review & post" },
  ];
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="IC scorer steps"
    >
      {tabs.map(({ s, label }) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={step === s}
          onClick={() => onStep(s)}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            step === s
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/70 text-foreground hover:bg-muted",
          )}
        >
          {s}. {label}
        </button>
      ))}
    </div>
  );
}

export function IcScorerWorkspace({
  dealId,
  memberId,
  expiresAt,
  authSig,
  authId,
  appSid,
  domain,
  loaderBootstrap,
  loaderBootstrapInput,
  bootstrapPrefetchHint = { kind: "ready" },
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

  const initialBootstrap = useMemo((): IcScorerBootstrapPayload | undefined => {
    if (
      loaderBootstrap &&
      bootstrapInputsMatch(
        dealId,
        { memberId, expiresAt, authSig, authId, appSid, domain },
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

  const q = useQuery({
    queryKey: ["ic-scorer-bootstrap", widgetInput],
    queryFn: () => loadIcScorerBootstrapData({ data: widgetInput }),
    initialData: initialBootstrap,
    staleTime: initialBootstrap ? 5_000 : 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const latest = data.recentIcScorerRuns[0];
      if (latest && !icRunIsTerminal(latest.status)) return 4_000;
      if ((data.ingestionPipelineJobs?.length ?? 0) > 0) return 2_000;
      const ingestBusy = data.dealDocuments.some((doc) =>
        INGEST_IN_FLIGHT.has(doc.ingestionStatus),
      );
      if (ingestBusy) return 3_000;
      return false;
    },
  });

  const [step, setStep] = useState<Step>(1);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [viewRunId, setViewRunId] = useState<string | null>(null);
  const [editedMemo, setEditedMemo] = useState("");
  const [memoDirty, setMemoDirty] = useState(false);

  const upload = useMutation(
    trpc.dealOpportunities.uploadBitrixScreeningWidgetDocuments.mutationOptions({
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
    }),
  );

  const deleteDealDocument = useMutation(
    trpc.dealOpportunities.deleteBitrixScreeningWidgetDocument.mutationOptions({
      onSuccess: () => {
        toast.success("Document deleted");
        void q.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Could not delete document"),
    }),
  );

  const startRun = useMutation(
    trpc.dealOpportunities.startIcScorerWidgetRun.mutationOptions({
      onSuccess: () => {
        setViewRunId(null);
        setStep(2);
        toast.success("IC scorer run started");
        void q.refetch();
      },
      onError: (e) => toast.error(e.message || "Could not start run"),
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
      description: "IC scorer widget upload",
      category: "OTHER",
    });
  }, [uploadFiles, upload, widgetInput]);

  const onPickFiles = useCallback((picked: File[]) => {
    setUploadFiles((prev) => {
      const next = new Map<string, File>();
      for (const f of prev) next.set(pendingUploadKey(f), f);
      for (const f of picked) next.set(pendingUploadKey(f), f);
      return Array.from(next.values());
    });
  }, []);

  const onRemovePendingUpload = useCallback((key: string) => {
    setUploadFiles((prev) => prev.filter((f) => pendingUploadKey(f) !== key));
  }, []);

  const d = q.data;
  const docs = (d?.dealDocuments ?? []) as DealDocumentRow[];
  const processedDocs = useMemo(
    () => docs.filter((doc) => doc.ingestionStatus === "PROCESSED"),
    [docs],
  );
  const pipelineRows = mergeIngestionPipelineJobsForDisplay(
    d?.ingestionPipelineJobs ?? [],
  );
  const ingestSummary = summarizeIngestion(docs);
  const indexed = (d?.indexedCount ?? 0) > 0;

  const latestRunId = d?.recentIcScorerRuns[0]?.runId ?? null;
  const effectiveRunId = viewRunId ?? latestRunId;

  const runDetailQuery = useQuery({
    ...trpc.dealOpportunities.getIcScorerWidgetRunDetail.queryOptions({
      ...widgetInput,
      runId: effectiveRunId ?? "__none__",
    }),
    enabled: Boolean(effectiveRunId),
    refetchInterval: (query) => {
      const st = query.state.data?.run?.status;
      if (!st || icRunIsTerminal(st)) return false;
      return 4_000;
    },
  });

  const displayRun = runDetailQuery.data?.run;
  const output = displayRun?.output ?? null;
  const runStatus = displayRun?.status;

  useEffect(() => {
    if (!output || memoDirty) return;
    if (output.memo) {
      setEditedMemo(formatIcScorerMemoPlainText(output.memo));
    } else if (output.memoHtml?.trim()) {
      setEditedMemo(output.memoHtml);
    } else {
      setEditedMemo("");
    }
  }, [output?.memo, output?.memoHtml, memoDirty]);

  const postTimeline = useMutation({
    mutationFn: async (args: { comment: string; score: number | null }) => {
      const res = await fetch("/api/ic-scorer/post-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dealId,
          comment: args.comment,
          score: args.score,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        truncated?: boolean;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.truncated ? "Posted (truncated)" : "Posted to Bitrix timeline",
      );
    },
    onError: (e: Error) => toast.error(e.message || "Post failed"),
  });

  const sortedFields = useMemo(() => {
    if (!d?.fields) return [];
    return [...d.fields].sort((a, b) => {
      const ap = PRIORITY_KEYS.has(a.key);
      const bp = PRIORITY_KEYS.has(b.key);
      if (ap !== bp) return ap ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [d?.fields]);

  const bitrixUrl =
    d?.portalBaseUrl && dealId
      ? `${d.portalBaseUrl.replace(/\/$/, "")}/crm/deal/details/${dealId}/`
      : null;

  const canStart = indexed;

  const isMonographMode = processedDocs.length === 1;
  const screeningModeBadge = processedDocs.length === 0
    ? null
    : isMonographMode
      ? "monograph"
      : "rag";

  const cc = scoreColors(output?.color);
  const scoreNum = typeof output?.score === "number" ? output.score : null;
  const hasMemo =
    Boolean(output?.memo) || Boolean(output?.memoHtml?.trim());
  const runBusy = runStatus && !icRunIsTerminal(runStatus);

  if (q.isLoading && !d) {
    return (
      <div className="text-muted-foreground bg-muted/20 mx-auto mt-8 flex min-h-[200px] max-w-3xl flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm">
        <Loader2 className="size-8 animate-spin" aria-hidden />
        Loading deal…
      </div>
    );
  }

  if (q.error || !d) {
    return (
      <Alert variant="destructive" className="mx-auto mt-8 max-w-lg">
        <AlertCircle className="size-4" />
        <AlertTitle>Could not load deal</AlertTitle>
        <AlertDescription>
          {q.error?.message ?? "Check widget auth and Bitrix webhook."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="bg-background text-foreground mx-auto max-w-5xl px-5 py-5 md:px-10 md:py-7">
      {d.recentIcScorerRuns.length > 0 && latestRunId ? (
        <div className="border-border/20 bg-muted/10 mb-4 rounded-lg border p-3 space-y-2">
          <p className="text-foreground text-xs font-medium tracking-tight">
            Run history
          </p>
          <Select
            value={effectiveRunId ?? latestRunId}
            onValueChange={(runId) => {
              setMemoDirty(false);
              setViewRunId(runId === latestRunId ? null : runId);
              setStep(2);
            }}
          >
            <SelectTrigger
              id="ic-scorer-run-history"
              className="h-10 w-full max-w-xl text-left font-normal"
              aria-label="Select IC scorer run"
            >
              <SelectValue placeholder="Select a run" />
            </SelectTrigger>
            <SelectContent>
              {d.recentIcScorerRuns.map((r, i) => (
                <SelectItem key={r.runId} value={r.runId}>
                  {r.mode} · {r.status}
                  {i === 0 ? " · latest" : ""} ·{" "}
                  {new Date(r.createdAt).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {bootstrapPrefetchHint.kind === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Prefetch failed</AlertTitle>
          <AlertDescription>{bootstrapPrefetchHint.message}</AlertDescription>
        </Alert>
      ) : null}

      {runBusy ? (
        <Alert className="border-primary/30 bg-primary/5 mb-4">
          <Loader2 className="text-primary size-4 animate-spin" aria-hidden />
          <AlertTitle>IC scorer running</AlertTitle>
          <AlertDescription>
            Status: {runStatus}. This page refreshes every few seconds until the
            run finishes.
          </AlertDescription>
        </Alert>
      ) : null}

      <header className="mb-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[26px] font-semibold tracking-[-0.02em]">
              <Sparkles className="text-foreground/50 size-6" aria-hidden />
              IC Readiness scorer
            </h1>
            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
              Bitrix #{d.dealId}
              {d.title ? ` · ${d.title}` : ""}
              {d.stageId ? ` · ${d.stageId}` : ""}
            </p>
          </div>
          {bitrixUrl ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={bitrixUrl} target="_blank" rel="noopener noreferrer">
                Open in Bitrix
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
        <StepTabs step={step} onStep={setStep} />
      </header>

      {step === 1 ? (
        <div className="space-y-5">
          {!d.webhookConfigured ? (
            <Alert variant="destructive">
              <AlertTitle>Bitrix webhook not configured</AlertTitle>
              <AlertDescription>
                CRM fields cannot load until BITRIX24_WEBHOOK is set.
              </AlertDescription>
            </Alert>
          ) : null}

          {screeningModeBadge ? (
            <Badge variant="outline" className="border-border/20 text-xs font-medium w-fit">
              {screeningModeBadge === "monograph"
                ? "Single-file (monograph)"
                : "Multi-file (RAG)"}
            </Badge>
          ) : null}

          {pipelineRows.length > 0 ? (
            <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
              <p className="text-foreground text-xs font-medium tracking-tight">
                Indexing files
              </p>
              <IngestionProgressList rows={pipelineRows} />
            </div>
          ) : ingestSummary &&
            ingestSummary.total > 0 &&
            (ingestSummary.inFlight > 0 || ingestSummary.failed > 0) ? (
            <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="text-foreground font-medium">File indexing</span>
                <span className="text-muted-foreground tabular-nums">
                  {ingestSummary.finishedPipeline} of {ingestSummary.total} finished
                </span>
              </div>
              <Progress value={ingestSummary.pct} className="h-1" aria-label="Document indexing progress" />
            </div>
          ) : null}

          {processedDocs.length > 0 ? (
            <ul className="divide-border/20 divide-y">
              {processedDocs.map((doc) => (
                <DocumentListItem
                  key={doc.id}
                  doc={doc}
                  variant="processed"
                  deletingDisabled={deleteDealDocument.isPending}
                  onDelete={(x) =>
                    deleteDealDocument.mutate({
                      ...widgetInput,
                      documentId: x.id,
                    })
                  }
                />
              ))}
            </ul>
          ) : null}

          <UploadQueue
            files={uploadFiles}
            onPick={onPickFiles}
            onRemove={onRemovePendingUpload}
            onUpload={handleUpload}
            uploading={upload.isPending}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              className="transition-transform active:scale-[0.98]"
              disabled={!canStart || startRun.isPending}
              onClick={() => startRun.mutate({ ...widgetInput })}
            >
              {startRun.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  Run IC scorer
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            {!canStart ? (
              <p className="text-muted-foreground max-w-md text-xs">
                {indexed
                  ? "Need indexed chunks — ensure files are processed."
                  : "Index at least one document first."}
              </p>
            ) : null}
          </div>

          <div className="border-border/20 bg-muted/10 rounded-lg border p-3">
            <p className="text-xs font-medium tracking-tight mb-2">CRM fields</p>
            <ul className="grid gap-x-6 gap-y-1 text-xs md:grid-cols-2 max-h-[320px] overflow-y-auto">
              {sortedFields.map((f) => (
                <li key={f.key} className="flex gap-2 min-w-0">
                  <span className="text-muted-foreground w-[42%] shrink-0 truncate">
                    {f.label}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{f.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          {runDetailQuery.isLoading && effectiveRunId ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading run…
            </div>
          ) : null}
          {displayRun?.status === "FAILED" ? (
            <Alert variant="destructive">
              <AlertTitle>Run failed</AlertTitle>
              <AlertDescription>
                {displayRun.errorMessage ?? "Unknown error"}
              </AlertDescription>
            </Alert>
          ) : null}
          {!output && runBusy ? (
            <p className="text-muted-foreground text-sm">
              Generating score and memo…
            </p>
          ) : null}
          {output ? (
            <>
              <div
                  className={cn(
                    "animate-in fade-in zoom-in-95 rounded-2xl border p-4 ring-2 duration-500 md:p-5",
                    cc.ring,
                    cc.bg,
                  )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className={cn("text-5xl font-semibold tabular-nums", cc.text)}>
                    {output.score}
                    <span className="text-muted-foreground text-2xl font-normal">
                      /100
                    </span>
                  </p>
                  <Badge variant="outline" className={cn("border", cc.badge)}>
                    {output.color}
                  </Badge>
                </div>
                <p className="text-foreground mt-3 text-lg font-medium leading-snug">
                  {output.headline}
                </p>
              </div>
              <RunOutputPreview o={output} />
              {output.memo ? <MemoStructuredPreview memo={output.memo} /> : null}
              {output.missingFields?.length ? (
                <Alert>
                  <AlertTitle>Missing fields</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 list-disc pl-5">
                      {output.missingFields.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : !runBusy && effectiveRunId ? (
            <p className="text-muted-foreground text-sm">
              No output for this run yet.
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              className="transition-transform active:scale-[0.98]"
              disabled={!hasMemo}
              onClick={() => setStep(3)}
            >
              Continue to post
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Bitrix timeline comment</p>
            <p className="text-muted-foreground text-xs">
              Plain text (prefilled from structured memo). Edit before posting.
            </p>
            <Textarea
              value={editedMemo}
              onChange={(e) => {
                setMemoDirty(true);
                setEditedMemo(e.target.value);
              }}
              className="min-h-[220px] font-mono text-xs"
              placeholder="Runs with a memo fill this automatically…"
              disabled={!hasMemo}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              type="button"
              className="transition-transform active:scale-[0.98]"
              disabled={postTimeline.isPending || !editedMemo.trim()}
              onClick={() =>
                postTimeline.mutate({
                  comment: editedMemo,
                  score: scoreNum,
                })
              }
            >
              {postTimeline.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Post to Bitrix timeline
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
