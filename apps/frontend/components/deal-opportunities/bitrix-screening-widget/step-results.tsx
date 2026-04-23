import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScreeningResultQuestionItem } from "./screening-result-question-item";
import { StepHeaderNav } from "./step-header-nav";
import type {
  LastRunAnswer,
  ScreeningRunDetail,
  WidgetBootstrap,
  WizardStep,
} from "./types";
import { cn } from "@/lib/utils";
import {
  screeningFailed,
  screeningRunStatusBadgeClassName,
  screeningStillRunning,
} from "./utils";

export function StepResults({
  activeJobsCount,
  lastRun,
  recentRuns,
  displayRun,
  latestRunId,
  effectiveViewRunId,
  onSelectRun,
  orderedAnswers,
  runDetailError,
  runDetailLoading,
  canRunNow,
  runPending,
  onRetry,
  goStep,
}: {
  activeJobsCount: number;
  lastRun: WidgetBootstrap["lastRun"];
  recentRuns: WidgetBootstrap["recentScreeningRuns"];
  displayRun: ScreeningRunDetail | null;
  latestRunId: string | undefined;
  effectiveViewRunId: string | null;
  onSelectRun: (runId: string) => void;
  orderedAnswers: LastRunAnswer[];
  runDetailError: string | null;
  runDetailLoading: boolean;
  canRunNow: boolean;
  runPending: boolean;
  onRetry: () => void;
  goStep: (s: WizardStep) => void;
}) {
  return (
    <section aria-labelledby="step-results-title">
      <StepHeaderNav
        stepLabel="Step 3 of 3 · Results"
        back={{ label: "Screener", onClick: () => goStep(2) }}
      />

      <div className="space-y-8">
        <div className="space-y-2">
          <h2
            id="step-results-title"
            className="text-lg font-semibold tracking-tight"
          >
            Results
          </h2>
          <p className="text-muted-foreground max-w-[62ch] text-[13px] leading-relaxed">
            Choose a screening run to review scores and rationale. Latest run
            loads by default.
          </p>
        </div>

        {activeJobsCount > 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
            <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
            Workflow running ({activeJobsCount} job
            {activeJobsCount > 1 ? "s" : ""})…
          </div>
        ) : null}

        {!lastRun ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            No screening runs yet. Go to step 2 to start one.
          </p>
        ) : (
          <div className="space-y-6">
            {recentRuns.length > 1 ? (
              <div className="space-y-2">
                <label
                  htmlFor="bitrix-widget-view-run"
                  className="text-muted-foreground block text-[10px] font-semibold tracking-[0.16em] uppercase"
                >
                  Screening run
                </label>
                <Select
                  value={effectiveViewRunId ?? ""}
                  onValueChange={onSelectRun}
                >
                  <SelectTrigger
                    id="bitrix-widget-view-run"
                    className="cursor-pointer"
                  >
                    <SelectValue placeholder="Choose run" />
                  </SelectTrigger>
                  <SelectContent>
                    {recentRuns.map((r) => (
                      <SelectItem key={r.runId} value={r.runId}>
                        <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                          <span className="text-foreground">
                            {new Date(r.createdAt).toLocaleString()} ·{" "}
                            {r.screenerName ?? "Screener"} ·
                          </span>
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                              screeningRunStatusBadgeClassName(r.status),
                            )}
                          >
                            {r.status}
                          </span>
                          {r.runId === latestRunId ? (
                            <span className="text-muted-foreground">(latest)</span>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {runDetailError ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Could not load run</AlertTitle>
                <AlertDescription>{runDetailError}</AlertDescription>
              </Alert>
            ) : null}

            {runDetailLoading ? (
              <div
                className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200"
                role="status"
              >
                <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
                Loading run…
              </div>
            ) : displayRun ? (
              <RunDetailView
                run={displayRun}
                orderedAnswers={orderedAnswers}
                canRunNow={canRunNow}
                runPending={runPending}
                onRetry={onRetry}
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function RunDetailView({
  run,
  orderedAnswers,
  canRunNow,
  runPending,
  onRetry,
}: {
  run: ScreeningRunDetail;
  orderedAnswers: LastRunAnswer[];
  canRunNow: boolean;
  runPending: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="border-border/60 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
              Status
            </span>
            <Badge
              variant="outline"
              className={cn(
                "border font-medium",
                screeningRunStatusBadgeClassName(run.status),
              )}
            >
              {run.status}
            </Badge>
          </div>
          {run.screenerName ? (
            <p className="text-[13px]">
              <span className="text-muted-foreground">Screener · </span>
              <span className="text-foreground font-medium">
                {run.screenerName}
              </span>
            </p>
          ) : null}
          <p className="text-muted-foreground font-mono text-[11px] tabular-nums">
            {new Date(run.createdAt).toLocaleString()}
          </p>
          {run.errorMessage ? (
            <p className="text-destructive pt-1 text-xs whitespace-pre-wrap">
              {run.errorMessage}
            </p>
          ) : null}
          {screeningFailed(run.status) ? (
            <div className="flex flex-col gap-1.5 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="cursor-pointer"
                disabled={!canRunNow || runPending}
                onClick={onRetry}
              >
                {runPending ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <RefreshCw className="mr-2 size-3.5" aria-hidden />
                )}
                Retry screening
              </Button>
              <p className="text-muted-foreground max-w-md text-[11px] leading-relaxed">
                Starts a new run from step 2. Change the screener there if
                needed.
              </p>
            </div>
          ) : null}
        </div>
        {orderedAnswers.length > 0 ? (
          <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
            {orderedAnswers.length} question
            {orderedAnswers.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {orderedAnswers.length === 0 ? (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {screeningStillRunning(run.status)
            ? "Answers appear when screening completes."
            : "No answers stored for this run."}
        </p>
      ) : (
        <ScrollArea className="h-[min(66vh,720px)] pr-2">
          <ol className="m-0 list-none p-0 pb-1">
            {orderedAnswers.map((a, idx) => (
              <ScreeningResultQuestionItem
                key={a.questionId}
                answer={a}
                displayIndex={idx + 1}
                totalQuestions={orderedAnswers.length}
              />
            ))}
          </ol>
        </ScrollArea>
      )}
    </div>
  );
}
