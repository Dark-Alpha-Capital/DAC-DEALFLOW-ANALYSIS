import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  loadBitrixScreeningWidgetBootstrapData,
  type BitrixScreeningWidgetBootstrapInput,
  type BitrixScreeningWidgetBootstrapPayload,
} from "@/lib/server/load-bitrix-screening-widget-bootstrap";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { DealContextDialogBody } from "./bitrix-screening-widget/deal-context-dialog-body";
import { DeleteDocumentDialog } from "./bitrix-screening-widget/delete-document-dialog";
import { StepDocuments } from "./bitrix-screening-widget/step-documents";
import { StepResults } from "./bitrix-screening-widget/step-results";
import { StepScreener } from "./bitrix-screening-widget/step-screener";
import { WizardStepNav } from "./bitrix-screening-widget/wizard-step-nav";
import type {
  DealDocumentRow,
  ScreeningRunDetail,
  WidgetBootstrap,
  WizardStep,
} from "./bitrix-screening-widget/types";
import {
  bitrixWidgetBootstrapInputsMatch,
  mergeIngestionPipelineJobsForDisplay,
  pendingUploadKey,
  screeningFailed,
  screeningStillRunning,
  startScreeningBlockedReason,
  summarizeIngestion,
  inProgressStatusChipClassName,
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
  loaderBootstrap?: BitrixScreeningWidgetBootstrapPayload | null;
  loaderBootstrapInput?: BitrixScreeningWidgetBootstrapInput | null;
};

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

  const [screenerId, setScreenerId] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  /** `null` = follow the latest run from bootstrap. Set to a past `runId` to load that run's answers. */
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
        (doc) =>
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
      onSuccess: (res) => {
        setViewRunId(null);
        setWizardStep(3);
        const isMonographRun = res.queueName === "cim-monograph-screening";
        toast.success(
          isMonographRun
            ? "Monograph screening started."
            : `Screening started (waited ${Math.round((q.data?.vectorSettleMsAfterIngest ?? 12_000) / 1000)}s for vector index)`,
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
    run.mutate({
      ...widgetInput,
      screenerId: effectiveScreenerId,
    });
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
        (doc) =>
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

  const processedDocs = useMemo(
    () =>
      (d?.dealDocuments ?? []).filter(
        (doc) => doc.ingestionStatus === "PROCESSED",
      ),
    [d?.dealDocuments],
  );

  const pendingDocs = useMemo(
    () =>
      (d?.dealDocuments ?? []).filter(
        (doc) => doc.ingestionStatus !== "PROCESSED",
      ),
    [d?.dealDocuments],
  );

  const effectiveRunBlocked = runBlocked;
  const canRunNow = d != null && effectiveRunBlocked === null;

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

  const isMonographMode = processedDocs.length === 1;
  const resolvedTargetDocumentId = isMonographMode
    ? processedDocs[0]?.id
    : null;
  const screeningModeBadge =
    processedDocs.length === 0 ? null : isMonographMode ? "monograph" : "rag";

  const goWizardStep = useCallback(
    (s: WizardStep) => {
      if (s === 2 && !canOpenStep2) return;
      setWizardStep(s);
    },
    [canOpenStep2],
  );

  const onSelectViewRun = useCallback(
    (value: string) => {
      if (value === latestRunId) setViewRunId(null);
      else setViewRunId(value);
    },
    [latestRunId],
  );

  const onConfirmDeleteDoc = useCallback(
    (doc: DealDocumentRow) => {
      deleteDealDocument.mutate({ ...widgetInput, documentId: doc.id });
    },
    [deleteDealDocument, widgetInput],
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

  /** After a failed run, default the screener dropdown to the same screener until the user picks another. */
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
      <DeleteDocumentDialog
        doc={documentToDelete}
        deleting={deleteDealDocument.isPending}
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={onConfirmDeleteDoc}
      />

      <Dialog>
        <div className="bg-background text-foreground mx-auto max-w-5xl px-5 py-5 md:px-10 md:py-7">
          <header className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
                  Opportunity screening
                </p>
                <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
                  Deal screening
                </h1>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums">
                  <span>Bitrix #{d.bitrixDealId}</span>
                  <span aria-hidden>·</span>
                  <span>App {d.appDeal.id}</span>
                  <span aria-hidden>·</span>
                  <span
                    className={cn(
                      indexed
                        ? "font-medium text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {d.indexedCount} chunk{d.indexedCount === 1 ? "" : "s"}{" "}
                    indexed
                  </span>
                </div>
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
                {run.isPending ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 border py-1",
                      inProgressStatusChipClassName,
                    )}
                  >
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                    Preparing…
                  </Badge>
                ) : null}
              </div>
            </div>
            <WizardStepNav
              step={wizardStep}
              onStepChange={goWizardStep}
              canOpenStep2={canOpenStep2}
            />
          </header>

          <div className="pt-5">
            {wizardStep === 1 ? (
              <StepDocuments
                indexed={indexed}
                processedDocs={processedDocs}
                pendingDocs={pendingDocs}
                pipelineRows={displayIngestionPipelineJobs}
                ingestSummary={ingestSummary}
                screeningModeBadge={screeningModeBadge}
                canOpenStep2={canOpenStep2}
                goStep={goWizardStep}
                uploadFiles={uploadFiles}
                onPickFiles={onPickFiles}
                onRemovePending={onRemovePendingUpload}
                onUpload={() => void handleUpload()}
                uploading={upload.isPending}
                deleteDisabled={deleteDealDocument.isPending}
                onRequestDelete={setDocumentToDelete}
              />
            ) : null}

            {wizardStep === 2 ? (
              <StepScreener
                screeners={screeners}
                effectiveScreenerId={effectiveScreenerId}
                onScreenerIdChange={setScreenerId}
                screeningModeBadge={screeningModeBadge}
                indexedCount={d.indexedCount}
                vectorWaitSec={vectorWaitSec}
                canRunNow={canRunNow}
                runPending={run.isPending}
                blockedReason={effectiveRunBlocked}
                onStartScreening={handleStartScreening}
                goStep={goWizardStep}
              />
            ) : null}

            {wizardStep === 3 ? (
              <StepResults
                activeJobsCount={d.activeJobs.length}
                lastRun={d.lastRun}
                recentRuns={d.recentScreeningRuns}
                displayRun={displayRun}
                latestRunId={latestRunId}
                effectiveViewRunId={effectiveViewRunId}
                onSelectRun={onSelectViewRun}
                orderedAnswers={orderedScreeningAnswers}
                runDetailError={
                  runDetailQuery.isError
                    ? (runDetailQuery.error?.message ??
                      "Try again or pick another run.")
                    : null
                }
                runDetailLoading={viewingRunDetailLoading}
                canRunNow={canRunNow}
                runPending={run.isPending}
                onRetry={handleStartScreening}
                goStep={goWizardStep}
              />
            ) : null}
          </div>
        </div>

        <DealContextDialogBody data={d} />
      </Dialog>
    </>
  );
}
