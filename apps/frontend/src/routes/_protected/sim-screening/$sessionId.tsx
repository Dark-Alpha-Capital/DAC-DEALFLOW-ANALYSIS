import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
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
import useCurrentUser from "@/hooks/use-current-user";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

export const Route = createFileRoute("/_protected/sim-screening/$sessionId")({
  head: () => ({
    meta: [{ title: "SIM screening session — Dark Alpha Capital" }],
  }),
  component: SimScreeningSessionDetailPage,
});

function formatBytes(n: number | null | undefined) {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function SimScreeningSessionDetailPage() {
  const { sessionId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const { data, isLoading, error } = useQuery({
    ...trpc.simScreening.getSession.queryOptions({ sessionId }),
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 2000;
      if (d.session.status === "COMPLETED" || d.session.status === "FAILED") {
        return false;
      }
      const st = d.job?.state;
      if (st === "completed" || st === "failed") return false;
      return 2000;
    },
  });

  const retryMutation = useMutation(
    trpc.simScreening.retry.mutationOptions({
      onSuccess: (res) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: res.jobId,
                fileName: data?.document?.fileName ?? "SIM.pdf",
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        void queryClient.invalidateQueries({
          queryKey: trpc.simScreening.getSession.queryKey({ sessionId }),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listSessions.queryKey({ limit: 20 }),
        });
        toast.success("Retry started");
      },
      onError: (e) => {
        toast.error(e.message ?? "Retry failed");
      },
    }),
  );

  if (isLoading && !data) {
    return (
      <section className="block-space-mini container max-w-5xl">
        <p className="text-muted-foreground text-sm">Loading session…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="block-space-mini container max-w-5xl">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link to="/sim-screening/">
            <ArrowLeft className="mr-2 size-4" />
            Back to SIM screening
          </Link>
        </Button>
        <p className="text-destructive text-sm">
          {error?.message ?? "Session not found."}
        </p>
      </section>
    );
  }

  const { session, document: doc, screener, rows, job } = data;
  const progressPct = job?.progress?.percentage ?? 0;
  const progressStep = job?.progress?.step ?? "";
  const running =
    session.status !== "COMPLETED" && session.status !== "FAILED";

  return (
    <section className="block-space-mini container max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sim-screening/">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold md:text-3xl">SIM screening session</h1>
        <Badge variant="secondary">{session.status}</Badge>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Document
          </h2>
          {doc ? (
            <dl className="space-y-1 text-sm">
              <div>
                <dt className="text-muted-foreground inline">File</dt>{" "}
                <dd className="inline font-medium">{doc.fileName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground inline">Title</dt>{" "}
                <dd className="inline">{doc.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground inline">Size</dt>{" "}
                <dd className="inline">{formatBytes(doc.fileSize)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground inline">Ingestion</dt>{" "}
                <dd className="inline">
                  <Badge variant="outline" className="ml-1">
                    {doc.ingestionStatus}
                  </Badge>
                </dd>
              </div>
              {doc.ingestionError ? (
                <p className="text-destructive mt-2 text-xs">
                  {doc.ingestionError}
                </p>
              ) : null}
              {doc.ingestionCompletedAt ? (
                <p className="text-muted-foreground text-xs">
                  Ingestion completed{" "}
                  {new Date(doc.ingestionCompletedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Uploaded {new Date(doc.createdAt).toLocaleString()}
              </p>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">No document</p>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Screener
          </h2>
          {screener ? (
            <p className="text-sm">
              <span className="font-medium">{screener.name}</span>{" "}
              <span className="text-muted-foreground">({screener.category})</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Session ID: <code className="text-foreground">{session.id}</code>
          </p>
          <p className="text-muted-foreground text-xs">
            Updated {new Date(session.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {running && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-semibold">Progress</h2>
          <Progress value={progressPct} className="mb-2 h-2" />
          <p className="text-muted-foreground text-xs">
            {progressStep || "Queued…"}
          </p>
          {job?.failedReason ? (
            <p className="text-destructive mt-2 text-xs">{job.failedReason}</p>
          ) : null}
        </div>
      )}

      {session.status === "FAILED" && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-destructive text-sm">
            {session.errorMessage ?? "Screening failed."}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={retryMutation.isPending}
            onClick={() => retryMutation.mutate({ sessionId })}
          >
            {retryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Retrying…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                Retry screening
              </>
            )}
          </Button>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-lg font-semibold">Results</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          All screener questions; partial answers are kept if the run stopped
          early.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead className="w-24">Score</TableHead>
              <TableHead>Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.questionId}>
                <TableCell className="align-top text-sm">{row.question}</TableCell>
                <TableCell className="align-top font-medium">
                  {row.score ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground align-top text-sm">
                  {row.rationale ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
