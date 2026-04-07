import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Activity,
  ArrowLeft,
  Briefcase,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useCurrentUser from "@/hooks/use-current-user";
import { useRouter } from "@/lib/navigation-shim";
import { QUEUE_NAMES } from "@repo/redis-queue/types";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import { loadCimScreeningSessionData } from "@/lib/server/cim-screening-route-data";
import CimScreeningSessionPending from "@/components/skeletons/cim-screening-ekeleton";
import { cn, formatBytes } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";

type SimScreeningGetSessionOutput =
  inferRouterOutputs<AppRouter>["simScreening"]["getSession"];
type SimScreeningGetSessionStatusOutput =
  inferRouterOutputs<AppRouter>["simScreening"]["getSessionStatus"];

const SESSION_POLL_INTERVAL_MS = 3_000;

function humanizeRunStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function runStatusBadgeProps(status: string | undefined) {
  if (!status) {
    return {
      label: "No run",
      variant: "outline" as const,
      className: "font-normal",
    };
  }
  if (status === "COMPLETED") {
    return {
      label: humanizeRunStatus(status),
      variant: "secondary" as const,
      className:
        "border-emerald-500/20 bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-400",
    };
  }
  if (status === "FAILED") {
    return {
      label: humanizeRunStatus(status),
      variant: "destructive" as const,
      className: "font-normal",
    };
  }
  return {
    label: humanizeRunStatus(status),
    variant: "default" as const,
    className: "font-normal",
  };
}

type ScoreRow = SimScreeningGetSessionOutput["rows"][number];

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border/60 flex flex-col gap-0.5 border-b py-2.5 last:border-0 last:pb-0 sm:grid sm:grid-cols-[minmax(6.5rem,8rem)_1fr] sm:gap-x-4 sm:gap-y-1 sm:border-0 sm:py-0 sm:last:pb-0">
      <span className="text-muted-foreground text-xs font-medium sm:text-sm sm:font-normal">
        {label}
      </span>
      <div className="min-w-0 text-sm leading-relaxed font-medium sm:leading-snug">
        {children}
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2.5">
        <span className="bg-muted text-muted-foreground border-border/80 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base leading-tight">{title}</CardTitle>
          <CardDescription className="leading-relaxed text-pretty">
            {description}
          </CardDescription>
        </div>
      </div>
    </div>
  );
}

function EvidenceBlock({ row }: { row: ScoreRow }) {
  if (!row.evidenceCitations?.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ol className="max-h-64 list-decimal space-y-3 overflow-y-auto pl-4 wrap-anywhere">
      {row.evidenceCitations.map((c, i) => (
        <li
          key={`${row.questionId}-${c.chunkId}-${i}`}
          className="leading-relaxed"
        >
          <div className="text-muted-foreground mb-1 text-xs">
            {c.pageNumber != null
              ? `Page ${c.pageNumber}`
              : "Retrieved excerpt"}
          </div>
          {c.excerpt ? (
            <p className="text-foreground whitespace-pre-wrap">{c.excerpt}</p>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              No stored text for chunk{" "}
              <code className="bg-muted rounded px-1 font-mono text-[0.65rem]">
                {c.chunkId.length > 14
                  ? `${c.chunkId.slice(0, 12)}…`
                  : c.chunkId}
              </code>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export const Route = createFileRoute("/_protected/screening/$sessionId/")({
  validateSearch: (search: Record<string, unknown>) => ({
    runId:
      typeof search.runId === "string"
        ? search.runId
        : Array.isArray(search.runId)
          ? String(search.runId[0])
          : undefined,
  }),
  loaderDeps: ({ search }) => ({ runId: search.runId }),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loader: async ({ params, deps }) =>
    loadCimScreeningSessionData({
      data: {
        sessionId: params.sessionId,
        runId: deps.runId,
      },
    }),
  pendingComponent: CimScreeningSessionPending,
  head: () => ({
    meta: [{ title: "SIM screening session — Dark Alpha Capital" }],
  }),
  component: CimScreeningSessionDetailPage,
});

function CimScreeningSessionDetailPage() {
  const { sessionId } = Route.useParams();
  const { runId: runIdFromSearch } = Route.useSearch();
  const { sessionData: initialSessionData, screeners } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [newScreenerId, setNewScreenerId] = useState("");

  useEffect(() => {
    if (newScreenerId || screeners.length === 0) return;
    setNewScreenerId(screeners[0]?.id ?? "");
  }, [newScreenerId, screeners]);

  const fullSessionQuery = useQuery({
    ...trpc.simScreening.getSession.queryOptions({
      sessionId,
      runId: runIdFromSearch,
    }),
    initialData: initialSessionData as SimScreeningGetSessionOutput,
    staleTime: 60_000,
  });

  const runStatusForPoll = fullSessionQuery.data?.run?.status;
  const pollSessionActive =
    !!runStatusForPoll &&
    runStatusForPoll !== "COMPLETED" &&
    runStatusForPoll !== "FAILED";

  const pollSessionQuery = useQuery({
    ...trpc.simScreening.getSessionStatus.queryOptions({
      sessionId,
      runId: runIdFromSearch,
    }),
    enabled: pollSessionActive,
    refetchInterval: SESSION_POLL_INTERVAL_MS,
  });

  const data = useMemo((): SimScreeningGetSessionOutput | undefined => {
    const full = fullSessionQuery.data;
    if (!full) return undefined;
    const live: SimScreeningGetSessionStatusOutput | undefined =
      pollSessionQuery.data;
    if (!live) return full;

    const pollCaughtTerminal =
      full.run &&
      live.run &&
      full.run.id === live.run.id &&
      (live.run.status === "COMPLETED" || live.run.status === "FAILED") &&
      full.run.status !== live.run.status;

    if (pollSessionActive || pollCaughtTerminal) {
      return {
        ...full,
        runs: live.runs,
        selectedRunId: live.selectedRunId,
        run: live.run,
        job: live.job,
        screener: live.screener ?? full.screener,
      };
    }
    return full;
  }, [fullSessionQuery.data, pollSessionQuery.data, pollSessionActive]);

  useEffect(() => {
    if (runIdFromSearch) return;
    const resolvedRunId = data?.selectedRunId;
    if (!resolvedRunId) return;
    navigate({
      to: ".",
      search: { runId: resolvedRunId },
      replace: true,
    });
  }, [data?.selectedRunId, navigate, runIdFromSearch]);

  const lastTerminalInvalidateKey = useRef<string | null>(null);
  useEffect(() => {
    lastTerminalInvalidateKey.current = null;
  }, [sessionId, runIdFromSearch]);

  useEffect(() => {
    const run = pollSessionQuery.data?.run;
    if (!run) return;
    if (run.status !== "COMPLETED" && run.status !== "FAILED") return;
    const key = `${run.id}:${run.status}`;
    if (lastTerminalInvalidateKey.current === key) return;
    lastTerminalInvalidateKey.current = key;
    void queryClient.invalidateQueries({
      queryKey: trpc.simScreening.getSession.queryKey({
        sessionId,
        runId: runIdFromSearch,
      }),
    });
  }, [
    pollSessionQuery.data?.run,
    queryClient,
    sessionId,
    runIdFromSearch,
    trpc.simScreening,
  ]);

  const isLoading =
    !data && (fullSessionQuery.isPending || fullSessionQuery.isLoading);
  const error = fullSessionQuery.error;

  const retryMutation = useMutation(
    trpc.simScreening.retry.mutationOptions({
      onSuccess: (res) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: res.jobId,
                fileName:
                  data?.document?.fileName ??
                  (data?.dealOpportunity?.dealTeaser?.trim()
                    ? data.dealOpportunity.dealTeaser.trim().slice(0, 120)
                    : "Deal opportunity"),
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        queryClient.invalidateQueries(trpc.simScreening.pathFilter());
        queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listSessions.queryKey({ limit: 20 }),
        });
        void router.invalidate();
        toast.success("Retry started");
      },
      onError: (e) => {
        toast.error(e.message ?? "Retry failed");
      },
    }),
  );

  const startRunMutation = useMutation(
    trpc.simScreening.startRun.mutationOptions({
      onSuccess: (res) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: res.jobId,
                fileName:
                  data?.document?.fileName ??
                  (data?.dealOpportunity?.dealTeaser?.trim()
                    ? data.dealOpportunity.dealTeaser.trim().slice(0, 120)
                    : "Deal opportunity"),
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        setNewScreenerId("");
        navigate({
          to: ".",
          search: { runId: res.runId },
          replace: true,
        });
        queryClient.invalidateQueries(trpc.simScreening.pathFilter());
        queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listSessions.queryKey({ limit: 20 }),
        });
        void router.invalidate();
        toast.success("Screening run started");
      },
      onError: (e) => {
        toast.error(e.message ?? "Could not start run");
      },
    }),
  );

  if (isLoading && !data) {
    return (
      <section className="container mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 px-4 py-20 sm:py-24">
        <Loader2
          className="text-muted-foreground size-8 animate-spin"
          aria-hidden
        />
        <p className="text-muted-foreground text-sm">Loading session…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="container mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-10 w-fit cursor-pointer gap-1.5 sm:min-h-8"
          asChild
        >
          <Link to="/screening">
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Screening
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Could not load session</AlertTitle>
          <AlertDescription>
            {error?.message ?? "Session not found."}
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  const {
    session,
    document: doc,
    dealOpportunity: dealOpp,
    screener,
    rows,
    job,
    runs,
    run,
  } = data;
  const progressPct = job?.progress?.percentage ?? 0;
  const progressStep = job?.progress?.step ?? "";
  const runStatus = run?.status;
  const running =
    runStatus != null && runStatus !== "COMPLETED" && runStatus !== "FAILED";

  const canAddRun = doc?.ingestionStatus === "PROCESSED" || Boolean(dealOpp);
  const selectedRunId = data.selectedRunId;
  const statusBadge = runStatusBadgeProps(runStatus);

  const setSelectedRun = (rid: string) => {
    navigate({
      to: ".",
      search: { runId: rid },
      replace: true,
    });
  };

  const SourceIcon = dealOpp ? Briefcase : FileText;

  return (
    <div className="min-w-0">
      <section className="container mx-auto max-w-6xl space-y-6 px-4 pt-5 pb-12 sm:space-y-8 sm:px-6 sm:pt-7 sm:pb-16">
        <header className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground -ml-2 h-10 min-h-10 cursor-pointer gap-1.5 px-2 sm:h-8 sm:min-h-8"
            asChild
          >
            <Link to="/screening">
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              All sessions
            </Link>
          </Button>
          <div className="border-border/80 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Screening session
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed text-pretty sm:text-[0.9375rem]">
                Source (SIM file or deal documents), run history, live progress,
                and per-question scores for the run you select.
              </p>
            </div>
            <Badge
              variant={statusBadge.variant}
              className={cn(
                "h-fit w-fit shrink-0 self-start px-2.5 py-1 text-xs font-medium sm:px-3",
                statusBadge.className,
              )}
            >
              {statusBadge.label}
            </Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <Card className="shadow-sm">
            <CardHeader className="space-y-4 pb-4">
              <SectionHeading
                icon={SourceIcon}
                title={dealOpp ? "Deal opportunity" : "Source document"}
                description={
                  dealOpp
                    ? "Template screening uses RAG across all ingested files for this deal."
                    : "File attached to this session."
                }
              />
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {doc ? (
                <div className="border-border/60 bg-muted/20 rounded-md border px-3 py-1 sm:px-4">
                  <MetaRow label="File">
                    <span className="wrap-break-word">{doc.fileName}</span>
                  </MetaRow>
                  <MetaRow label="Title">{doc.title}</MetaRow>
                  <MetaRow label="Size">{formatBytes(doc.fileSize)}</MetaRow>
                  <MetaRow label="Ingestion">
                    <Badge variant="outline" className="font-normal">
                      {doc.ingestionStatus}
                    </Badge>
                  </MetaRow>
                  {doc.ingestionError ? (
                    <p className="text-destructive pt-2 text-xs leading-relaxed">
                      {doc.ingestionError}
                    </p>
                  ) : null}
                  {doc.ingestionCompletedAt ? (
                    <p className="text-muted-foreground border-border/60 border-t pt-3 text-xs">
                      Ingestion finished{" "}
                      {new Date(doc.ingestionCompletedAt).toLocaleString()}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground border-border/60 border-t pt-3 text-xs">
                    Uploaded {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </div>
              ) : dealOpp ? (
                <div className="space-y-4">
                  <div className="border-border/60 bg-muted/20 rounded-md border px-3 py-1 sm:px-4">
                    <MetaRow label="Teaser">
                      <span className="wrap-break-word">
                        {dealOpp.dealTeaser?.trim() || "—"}
                      </span>
                    </MetaRow>
                    {dealOpp.description?.trim() ? (
                      <MetaRow label="Description">
                        <span className="line-clamp-6 whitespace-pre-wrap sm:line-clamp-4">
                          {dealOpp.description}
                        </span>
                      </MetaRow>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 w-full cursor-pointer sm:h-9 sm:min-h-9 sm:w-auto"
                      asChild
                    >
                      <Link
                        to="/deal-opportunities/$uid"
                        params={{ uid: dealOpp.id }}
                      >
                        Open deal opportunity
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No document on this session.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-4 pb-4">
              <SectionHeading
                icon={Layers}
                title="Runs & templates"
                description="Switch runs to view scores. For SIM uploads, start another template after ingestion completes. Deal sessions can add runs anytime if chunks exist."
              />
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              {runs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No screening runs yet.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label
                    htmlFor="run-select"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    Active run
                  </Label>
                  <Select
                    value={selectedRunId ?? undefined}
                    onValueChange={(v) => setSelectedRun(v)}
                  >
                    <SelectTrigger
                      id="run-select"
                      className="h-11 min-h-11 w-full cursor-pointer sm:h-10 sm:min-h-10"
                    >
                      <SelectValue placeholder="Select a run" />
                    </SelectTrigger>
                    <SelectContent>
                      {runs.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="line-clamp-2 text-left">
                            {r.screenerName} ·{" "}
                            {new Date(r.createdAt).toLocaleString()} ·{" "}
                            {r.status}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {screener ? (
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{screener.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {screener.category}
                      </span>
                    </p>
                  ) : null}
                  {selectedRunId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 w-full cursor-pointer sm:h-9 sm:min-h-9 sm:w-auto"
                      asChild
                    >
                      <Link
                        to="/screening/$sessionId/sync-bitrix-24"
                        params={{ sessionId }}
                        search={{ runId: selectedRunId }}
                      >
                        Sync to Bitrix24
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 min-h-11 w-full sm:h-9 sm:min-h-9 sm:w-auto"
                      disabled
                    >
                      Sync to Bitrix24
                    </Button>
                  )}
                </div>
              )}

              <Separator />

              {canAddRun ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-run-template-select"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      Template for new run
                    </Label>
                    <Select
                      value={newScreenerId || undefined}
                      onValueChange={setNewScreenerId}
                    >
                      <SelectTrigger
                        id="new-run-template-select"
                        className="h-11 min-h-11 w-full cursor-pointer sm:h-10 sm:min-h-10"
                      >
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {screeners.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <span className="line-clamp-2 text-left">
                              {template.name} · {template.category}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-11 min-h-11 w-full cursor-pointer sm:h-9 sm:min-h-9 sm:w-auto"
                    disabled={
                      running ||
                      !newScreenerId ||
                      startRunMutation.isPending ||
                      screeners.length === 0
                    }
                    onClick={() => {
                      if (!newScreenerId) return;
                      startRunMutation.mutate({
                        sessionId,
                        screenerId: newScreenerId,
                      });
                    }}
                  >
                    {startRunMutation.isPending ? (
                      <>
                        <Loader2
                          className="mr-2 size-4 animate-spin"
                          aria-hidden
                        />
                        Starting...
                      </>
                    ) : (
                      "Start new run"
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {dealOpp
                    ? "Add ingested documents to this deal before starting a screening run."
                    : "Ingestion must finish before you can start another screening run."}
                </p>
              )}

              <div className="text-muted-foreground border-border/80 space-y-1.5 border-t pt-4 text-xs">
                <p className="break-all">
                  Session{" "}
                  <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
                    {session.id}
                  </code>
                </p>
                <p>
                  Last updated {new Date(session.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {running ? (
          <Card
            className="border-primary/30 bg-muted/30 shadow-sm"
            aria-live="polite"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2.5">
                <span className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-md border">
                  <Activity className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base">Run in progress</CardTitle>
                  <CardDescription>
                    Updates every few seconds while the job is active.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold tabular-nums">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <Progress value={progressPct} className="h-2.5" />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {progressStep || "Queued…"}
              </p>
              {job?.failedReason ? (
                <p className="text-destructive text-sm leading-relaxed">
                  {job.failedReason}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {runStatus === "FAILED" && run ? (
          <Alert variant="destructive" className="border-destructive/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <AlertTitle>Screening failed</AlertTitle>
                <AlertDescription className="text-pretty">
                  {run.errorMessage ??
                    "The run ended with an error. You can retry with the same inputs."}
                </AlertDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/40 bg-background hover:bg-destructive/10 h-11 min-h-11 w-full shrink-0 cursor-pointer sm:h-9 sm:min-h-9 sm:w-auto sm:self-center"
                disabled={retryMutation.isPending}
                onClick={() => retryMutation.mutate({ runId: run.id })}
              >
                {retryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Retrying…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" aria-hidden />
                    Retry
                  </>
                )}
              </Button>
            </div>
          </Alert>
        ) : null}

        <section className="space-y-4">
          <SectionHeading
            icon={Table2}
            title="Question scores"
            description={
              runs.length === 0 || !selectedRunId
                ? "Start a run to see scores here."
                : "Scores, rationale, and RAG citation excerpts for the selected run."
            }
          />
          {rows.length === 0 ? (
            <div className="bg-muted/25 text-muted-foreground rounded-xl border border-dashed px-5 py-10 text-center text-sm sm:px-8 sm:py-14">
              {runs.length === 0
                ? "No data yet. Upload and run a screener to populate this table."
                : "No scored questions for this run yet. If the run is still processing, check back shortly."}
            </div>
          ) : (
            <>
              <div className="space-y-4 md:hidden">
                {rows.map((row) => (
                  <Card
                    key={row.questionId}
                    className="overflow-hidden shadow-sm"
                  >
                    <CardHeader className="space-y-2 pb-3">
                      <CardTitle className="text-sm leading-snug font-semibold text-pretty">
                        {row.question}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          Score
                        </span>
                        <span className="bg-muted rounded-md px-2 py-0.5 font-mono text-sm font-semibold tabular-nums">
                          {row.score ?? "—"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="border-border/60 space-y-4 border-t pt-4">
                      <div>
                        <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                          Rationale
                        </p>
                        <p className="text-foreground text-sm leading-relaxed">
                          {row.rationale ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                          References
                        </p>
                        <div className="text-sm">
                          <EvidenceBlock row={row} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="border-border/80 -mx-4 hidden min-w-0 overflow-x-auto rounded-xl border shadow-sm sm:mx-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[11rem] pl-4">
                        Question
                      </TableHead>
                      <TableHead className="w-20 whitespace-nowrap">
                        Score
                      </TableHead>
                      <TableHead className="max-w-md min-w-[12rem]">
                        Rationale
                      </TableHead>
                      <TableHead className="max-w-lg min-w-[14rem] pr-4">
                        References
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.questionId} className="align-top">
                        <TableCell className="max-w-xs pl-4 text-sm leading-relaxed wrap-anywhere">
                          {row.question}
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {row.score ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md text-sm leading-relaxed wrap-anywhere">
                          {row.rationale ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-md pr-4 align-top text-sm wrap-anywhere">
                          <EvidenceBlock row={row} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  );
}
