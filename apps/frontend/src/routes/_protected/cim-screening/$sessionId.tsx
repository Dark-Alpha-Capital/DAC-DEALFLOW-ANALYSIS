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
  Plus,
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

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(5rem,7rem)_1fr] gap-x-3 gap-y-1 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="min-w-0 leading-snug font-medium">{children}</div>
    </div>
  );
}

export const Route = createFileRoute("/_protected/cim-screening/$sessionId")({
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
      <section className="container flex max-w-5xl flex-col items-center justify-center gap-3 py-24">
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
      <section className="container max-w-5xl space-y-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit gap-1.5"
          asChild
        >
          <Link to="/cim-screening">
            <ArrowLeft className="size-4" aria-hidden />
            CIM screening
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

  return (
    <section className="container max-w-5xl space-y-8 pt-6 pb-12">
      <header className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 h-8 gap-1.5 px-2"
          asChild
        >
          <Link to="/cim-screening">
            <ArrowLeft className="size-4" aria-hidden />
            All sessions
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Screening session
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
              Source (SIM file or deal documents), run history, live progress,
              and per-question scores for the run you select.
            </p>
          </div>
          <Badge
            variant={statusBadge.variant}
            className={cn("shrink-0 self-start", statusBadge.className)}
          >
            {statusBadge.label}
          </Badge>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {dealOpp ? (
                <Briefcase
                  className="text-muted-foreground size-4"
                  aria-hidden
                />
              ) : (
                <FileText
                  className="text-muted-foreground size-4"
                  aria-hidden
                />
              )}
              <h2 className="text-base font-semibold tracking-tight">
                {dealOpp ? "Deal opportunity" : "Source document"}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {dealOpp
                ? "Template screening uses RAG across all ingested files for this deal."
                : "File attached to this session."}
            </p>
          </div>
          <div className="space-y-4">
            {doc ? (
              <div className="space-y-3">
                <MetaRow label="File">{doc.fileName}</MetaRow>
                <MetaRow label="Title">{doc.title}</MetaRow>
                <MetaRow label="Size">{formatBytes(doc.fileSize)}</MetaRow>
                <MetaRow label="Ingestion">
                  <Badge variant="outline" className="font-normal">
                    {doc.ingestionStatus}
                  </Badge>
                </MetaRow>
                {doc.ingestionError ? (
                  <p className="text-destructive text-xs leading-relaxed">
                    {doc.ingestionError}
                  </p>
                ) : null}
                {doc.ingestionCompletedAt ? (
                  <p className="text-muted-foreground text-xs">
                    Ingestion finished{" "}
                    {new Date(doc.ingestionCompletedAt).toLocaleString()}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  Uploaded {new Date(doc.createdAt).toLocaleString()}
                </p>
              </div>
            ) : dealOpp ? (
              <div className="space-y-3">
                <MetaRow label="Teaser">
                  {dealOpp.dealTeaser?.trim() || "—"}
                </MetaRow>
                {dealOpp.description?.trim() ? (
                  <MetaRow label="Description">
                    <span className="line-clamp-4 whitespace-pre-wrap">
                      {dealOpp.description}
                    </span>
                  </MetaRow>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
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
            ) : (
              <p className="text-muted-foreground text-sm">
                No document on this session.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="text-muted-foreground size-4" aria-hidden />
              <h2 className="text-base font-semibold tracking-tight">
                Runs & templates
              </h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Switch runs to view scores. For SIM uploads, start another
              template after ingestion completes. Deal sessions can add runs
              anytime if chunks exist.
            </p>
          </div>
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
                <SelectTrigger id="run-select" className="w-full">
                  <SelectValue placeholder="Select a run" />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.screenerName} ·{" "}
                      {new Date(r.createdAt).toLocaleString()} · {r.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {screener ? (
                <p className="text-sm">
                  <span className="font-medium">{screener.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {screener.category}
                  </span>
                </p>
              ) : null}
            </div>
          )}

          <Separator />

          {canAddRun ? (
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs font-medium">
                New run
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Select
                    value={newScreenerId}
                    onValueChange={setNewScreenerId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose screener template" />
                    </SelectTrigger>
                    <SelectContent>
                      {screeners.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  disabled={
                    !newScreenerId || startRunMutation.isPending || running
                  }
                  onClick={() =>
                    newScreenerId &&
                    startRunMutation.mutate({
                      sessionId,
                      screenerId: newScreenerId,
                    })
                  }
                >
                  {startRunMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <Plus className="mr-1.5 size-4" aria-hidden />
                      Start run
                    </>
                  )}
                </Button>
              </div>
              {running ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Wait for the current run to finish before starting another.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {dealOpp
                ? "Add ingested documents to this deal before starting a screening run."
                : "Ingestion must finish before you can start another screening run."}
            </p>
          )}

          <div className="text-muted-foreground space-y-1 border-t pt-4 text-xs">
            <p>
              Session{" "}
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.7rem]">
                {session.id}
              </code>
            </p>
            <p>Last updated {new Date(session.updatedAt).toLocaleString()}</p>
          </div>
        </section>
      </div>

      {running ? (
        <section
          className="border-primary/25 bg-muted/40 space-y-3 rounded-md border px-5 py-4"
          aria-live="polite"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="text-primary size-4" aria-hidden />
              <h2 className="text-base font-semibold tracking-tight">
                Run in progress
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Updates every few seconds while the job is active.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium tabular-nums">
              {Math.round(progressPct)}%
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-muted-foreground text-sm">
            {progressStep || "Queued…"}
          </p>
          {job?.failedReason ? (
            <p className="text-destructive text-sm leading-relaxed">
              {job.failedReason}
            </p>
          ) : null}
        </section>
      ) : null}

      {runStatus === "FAILED" && run ? (
        <Alert variant="destructive" className="border-destructive/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <AlertTitle>Screening failed</AlertTitle>
              <AlertDescription>
                {run.errorMessage ??
                  "The run ended with an error. You can retry with the same inputs."}
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/40 bg-background hover:bg-destructive/10 shrink-0 sm:self-center"
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Table2 className="text-muted-foreground size-4" aria-hidden />
            <h2 className="text-base font-semibold tracking-tight">
              Question scores
            </h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {runs.length === 0 || !selectedRunId
              ? "Start a run to see scores here."
              : "Scores, rationale, and RAG citation excerpts for the selected run."}
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="bg-muted/30 text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
            {runs.length === 0
              ? "No data yet. Upload and run a screener to populate this table."
              : "No scored questions for this run yet. If the run is still processing, check back shortly."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[12rem] pl-4">Question</TableHead>
                  <TableHead className="w-24">Score</TableHead>
                  <TableHead className="max-w-xl min-w-[14rem]">
                    Rationale
                  </TableHead>
                  <TableHead className="max-w-md min-w-[16rem] pr-4">
                    References
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.questionId} className="align-top">
                    <TableCell className="max-w-md pl-4 text-sm leading-relaxed">
                      {row.question}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {row.score ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                      {row.rationale ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-md pr-4 align-top text-sm">
                      {row.evidenceCitations &&
                      row.evidenceCitations.length > 0 ? (
                        <ol className="max-h-64 list-decimal space-y-3 overflow-y-auto pl-4">
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
                                <p className="text-foreground whitespace-pre-wrap">
                                  {c.excerpt}
                                </p>
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
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}
