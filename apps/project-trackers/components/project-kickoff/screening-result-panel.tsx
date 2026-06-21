import { ChevronLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  scoreBadgeClass,
  scoreColor,
  scoreLabel,
} from "@/lib/project-tracker-display";
import { cn } from "@/lib/utils";

type ScreeningProgress = {
  step: string;
  percentage: number;
};

type ScreeningResult = {
  score: number;
  analysis: string;
};

type ScreeningResultPanelProps = {
  state: "idle" | "polling" | "completed" | "failed";
  progress: ScreeningProgress | null;
  result: ScreeningResult | null;
  onRetry: () => void;
};

export function ScreeningResultPanel({
  state,
  progress,
  result,
  onRetry,
}: ScreeningResultPanelProps) {
  if (state === "polling") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="text-foreground size-4 animate-spin" aria-hidden />
          <span>Screening in progress…</span>
        </div>
        {progress ? (
          <div className="space-y-2">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{progress.step}</span>
              <span className="font-mono tabular-nums">
                {progress.percentage}%
              </span>
            </div>
            <Progress value={progress.percentage} className="h-1.5" />
          </div>
        ) : null}
      </div>
    );
  }

  if (state === "completed" && result) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-5xl font-semibold tracking-tight tabular-nums",
                scoreColor(result.score),
              )}
            >
              {result.score.toFixed(1)}
            </span>
            <span className="text-muted-foreground text-lg">/ 5</span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md border-0 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase",
              scoreBadgeClass(result.score),
            )}
          >
            {scoreLabel(result.score)}
          </Badge>
        </div>
        <p className="text-foreground max-w-2xl text-sm leading-relaxed">
          {result.analysis}
        </p>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm leading-relaxed">
          Screening failed. Your project was saved but evaluation did not
          complete.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <ChevronLeft className="size-4" aria-hidden />
          Go back and retry
        </Button>
      </div>
    );
  }

  return null;
}
