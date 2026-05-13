import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileText,
  Info,
  Layers,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DocumentListItem } from "./bitrix-screening-widget/document-list-item";
import { IngestionProgressList } from "./bitrix-screening-widget/ingestion-progress-list";
import { UploadQueue } from "./bitrix-screening-widget/upload-queue";
import type {
  DealDocumentRow,
  DisplayIngestionPipelineRow,
} from "./bitrix-screening-widget/types";
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

type MemoDraft = {
  headline: string;
  investmentThesis: string;
  alignmentMemos: { pillar: string; memo: string }[];
  strengthBullets: string[];
  riskAndGapsMemo: { risk: string; suggestedAction: string }[];
  recommendation: string;
};

function formatMemoDraftToPlainText(d: MemoDraft): string {
  return [
    "IC READINESS",
    d.headline.trim(),
    "",
    "Investment thesis",
    d.investmentThesis.trim(),
    "",
    "Alignment",
    ...d.alignmentMemos.map((row) => `• ${row.pillar}: ${row.memo.trim()}`),
    "",
    "Strengths",
    ...d.strengthBullets.map((s) => `• ${s.trim()}`),
    "",
    "Risks & gaps",
    ...d.riskAndGapsMemo.map(
      (r) =>
        `• ${r.risk.trim()}${r.suggestedAction.trim() ? ` — ${r.suggestedAction.trim()}` : ""}`,
    ),
    "",
    "Recommendation",
    d.recommendation.trim(),
  ].join("\n");
}

function memoDraftToStructured(d: MemoDraft): IcScorerMemoStructured {
  return {
    scoreHeadline: d.headline,
    investmentThesisMemo: d.investmentThesis,
    alignmentMemos: d.alignmentMemos,
    strengthBullets: d.strengthBullets,
    riskAndGapsMemo: d.riskAndGapsMemo,
    recommendationMemo: d.recommendation,
  };
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
  const [memoDraft, setMemoDraft] = useState<MemoDraft | null>(null);

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

  const [cancellingPipelineKeys, setCancellingPipelineKeys] = useState<
    Set<string>
  >(() => new Set());

  const cancelIngestion = useMutation(
    trpc.dealOpportunities.cancelBitrixScreeningWidgetIngestion.mutationOptions({
      onSuccess: () => {
        toast.success("Indexing stopped and partial files removed");
        void q.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Could not stop indexing"),
    }),
  );

  const handleCancelPipelineRow = useCallback(
    (row: DisplayIngestionPipelineRow) => {
      if (!row.cancelInstanceId && !row.fileName) return;
      setCancellingPipelineKeys((prev) => new Set(prev).add(row.key));
      cancelIngestion.mutate(
        {
          ...widgetInput,
          fileName: row.fileName ?? undefined,
          pipelineInstanceId: row.cancelInstanceId ?? undefined,
        },
        {
          onSettled: () => {
            setCancellingPipelineKeys((prev) => {
              const next = new Set(prev);
              next.delete(row.key);
              return next;
            });
          },
        },
      );
    },
    [cancelIngestion, widgetInput],
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
    setMemoDraft({
      headline: output.headline ?? output.memo?.scoreHeadline ?? "",
      investmentThesis:
        output.investmentThesis ?? output.memo?.investmentThesisMemo ?? "",
      alignmentMemos:
        output.memo?.alignmentMemos ??
        output.alignment?.map((a) => ({ pillar: a.pillar, memo: a.note })) ??
        [],
      strengthBullets: output.memo?.strengthBullets ?? output.strengths ?? [],
      riskAndGapsMemo: output.memo?.riskAndGapsMemo ?? output.risksAndGaps ?? [],
      recommendation:
        output.recommendation ?? output.memo?.recommendationMemo ?? "",
    });
  }, [output?.memo, output?.memoHtml, memoDirty]);

  useEffect(() => {
    if (!memoDraft || !memoDirty) return;
    setEditedMemo(formatMemoDraftToPlainText(memoDraft));
  }, [memoDraft]);

  const postTimeline = useMutation({
    mutationFn: async (args: {
      comment: string;
      score: number | null;
      memo?: IcScorerMemoStructured;
      postPdf?: boolean;
      fileName?: string;
    }) => {
      const res = await fetch("/api/ic-scorer/post-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          dealId,
          comment: args.comment,
          memo: args.memo,
          postPdf: args.postPdf,
          fileName: args.fileName,
          score: args.score,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        truncated?: boolean;
        pdfUrl?: string | null;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.pdfUrl
          ? "Posted PDF report to Bitrix timeline"
          : data.truncated
            ? "Posted (truncated)"
            : "Posted to Bitrix timeline",
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
    <Dialog>
      <div className="bg-background text-foreground mx-auto max-w-5xl px-5 py-5 md:px-10 md:py-7">
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
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-1.5 text-[13px]"
                >
                  <Info className="size-3.5 shrink-0" aria-hidden />
                  Deal context
                </Button>
              </DialogTrigger>
              {bitrixUrl ? (
                <Button variant="ghost" size="sm" asChild>
                  <a href={bitrixUrl} target="_blank" rel="noopener noreferrer">
                    Open in Bitrix
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
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
                <IngestionProgressList
                  rows={pipelineRows}
                  onCancelRow={handleCancelPipelineRow}
                  cancellingKeys={cancellingPipelineKeys}
                />
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

            {d.recentIcScorerRuns.length > 0 && latestRunId ? (
              <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
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
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
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
            {output || memoDraft ? (
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
                      {output?.score ?? "—"}
                      <span className="text-muted-foreground text-2xl font-normal">
                        /100
                      </span>
                    </p>
                    <Badge variant="outline" className={cn("border", cc.badge)}>
                      {output?.color ?? "—"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Headline</p>
                  <Input
                    value={memoDraft?.headline ?? ""}
                    onChange={(e) => {
                      setMemoDraft((prev) =>
                        prev ? { ...prev, headline: e.target.value } : prev,
                      );
                      setMemoDirty(true);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Investment thesis</p>
                  <Textarea
                    value={memoDraft?.investmentThesis ?? ""}
                    onChange={(e) => {
                      setMemoDraft((prev) =>
                        prev
                          ? { ...prev, investmentThesis: e.target.value }
                          : prev,
                      );
                      setMemoDirty(true);
                    }}
                    className="min-h-[100px]"
                  />
                </div>

                {memoDraft?.alignmentMemos.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Alignment</p>
                    {memoDraft.alignmentMemos.map((row, i) => (
                      <div key={`al-${i}`} className="space-y-1">
                        <p className="text-muted-foreground text-xs font-medium">
                          {row.pillar}
                        </p>
                        <Textarea
                          value={row.memo}
                          onChange={(e) => {
                            setMemoDraft((prev) => {
                              if (!prev) return prev;
                              const updated = [...prev.alignmentMemos];
                              updated[i] = {
                                ...updated[i],
                                memo: e.target.value,
                              };
                              return { ...prev, alignmentMemos: updated };
                            });
                            setMemoDirty(true);
                          }}
                          className="min-h-[60px]"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {memoDraft?.strengthBullets.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Strengths</p>
                    {memoDraft.strengthBullets.map((s, i) => (
                      <div key={`st-${i}`} className="space-y-1">
                        <p className="text-muted-foreground text-xs">
                          #{i + 1}
                        </p>
                        <Input
                          value={s}
                          onChange={(e) => {
                            setMemoDraft((prev) => {
                              if (!prev) return prev;
                              const updated = [...prev.strengthBullets];
                              updated[i] = e.target.value;
                              return { ...prev, strengthBullets: updated };
                            });
                            setMemoDirty(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {memoDraft?.riskAndGapsMemo.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Risks &amp; gaps</p>
                    {memoDraft.riskAndGapsMemo.map((r, i) => (
                      <div
                        key={`rg-${i}`}
                        className="border-border/60 space-y-1.5 rounded-lg border p-3"
                      >
                        <p className="text-muted-foreground text-xs font-medium">
                          Risk #{i + 1}
                        </p>
                        <Textarea
                          value={r.risk}
                          onChange={(e) => {
                            setMemoDraft((prev) => {
                              if (!prev) return prev;
                              const updated = [...prev.riskAndGapsMemo];
                              updated[i] = {
                                ...updated[i],
                                risk: e.target.value,
                              };
                              return { ...prev, riskAndGapsMemo: updated };
                            });
                            setMemoDirty(true);
                          }}
                          className="min-h-[60px]"
                        />
                        <Input
                          value={r.suggestedAction}
                          onChange={(e) => {
                            setMemoDraft((prev) => {
                              if (!prev) return prev;
                              const updated = [...prev.riskAndGapsMemo];
                              updated[i] = {
                                ...updated[i],
                                suggestedAction: e.target.value,
                              };
                              return { ...prev, riskAndGapsMemo: updated };
                            });
                            setMemoDirty(true);
                          }}
                          placeholder="Suggested action"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Recommendation</p>
                  <Textarea
                    value={memoDraft?.recommendation ?? ""}
                    onChange={(e) => {
                      setMemoDraft((prev) =>
                        prev
                          ? { ...prev, recommendation: e.target.value }
                          : prev,
                      );
                      setMemoDirty(true);
                    }}
                    className="min-h-[80px]"
                  />
                </div>

                {output?.missingFields?.length ? (
                  <Alert className="border-amber-500/40 bg-amber-500/5">
                    <TriangleAlert className="size-4 text-amber-600" aria-hidden />
                    <AlertTitle>Information gaps</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2 text-xs leading-relaxed">
                        The IC scorer couldn't determine values for these CRM
                        fields from your current documents. Adding documents with
                        this information could improve the score.
                      </p>
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
                disabled={!memoDraft}
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
                disabled={!editedMemo.trim() && !hasMemo}
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
              <Button
                type="button"
                variant="secondary"
                className="gap-2 transition-transform active:scale-[0.98]"
                disabled={postTimeline.isPending || !memoDraft || !editedMemo.trim()}
                onClick={() => {
                  if (!memoDraft) return;
                  postTimeline.mutate({
                    comment: editedMemo,
                    score: scoreNum,
                    memo: memoDraftToStructured(memoDraft),
                    postPdf: true,
                    fileName: `ic-readiness-report-deal-${dealId}.pdf`,
                  });
                }}
              >
                {postTimeline.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                Post PDF to timeline
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-border/80 shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle className="text-base">Deal context</DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            Workspace summary and non-empty deal fields from Bitrix.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="text-muted-foreground size-4" aria-hidden />
              <h3 className="text-sm font-semibold">Workspace</h3>
            </div>
            <div className="grid gap-1.5 text-sm">
              <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Title</span>
                <span className="min-w-0 font-medium break-words">
                  {d.title ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Stage</span>
                <span className="min-w-0 font-medium break-words">
                  {d.stageId ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-[88px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground">Deal ID</span>
                <span className="min-w-0 font-medium break-words">
                  #{d.dealId}
                </span>
              </div>
            </div>
          </section>
          <section className="space-y-2">
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
                  {sortedFields.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="text-muted-foreground px-2 py-3 text-center"
                      >
                        No Bitrix payload.
                      </td>
                    </tr>
                  ) : (
                    sortedFields.map((f) => (
                      <tr
                        key={f.key}
                        className="border-border/60 border-b last:border-0"
                      >
                        <td className="text-foreground w-[min(40%,200px)] px-2 py-1.5 align-top font-medium">
                          {f.label}
                        </td>
                        <td className="max-w-[min(55vw,320px)] px-2 py-1.5 break-words whitespace-pre-wrap">
                          {f.value || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
