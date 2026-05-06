import { memo } from "react";
import { cn } from "@/lib/utils";
import { EvidenceChunksCollapsible } from "./evidence-chunks-collapsible";
import type { LastRunAnswer } from "./types";

/** Out of 10: below 4 → red, 4–6.99 → orange, 7–10 → green. */
function scoreDisplayClass(score: number): string {
  const s = Math.max(0, Math.min(10, score));
  if (s < 4) {
    return "text-red-600 dark:text-red-400";
  }
  if (s < 7) {
    return "text-orange-600 dark:text-orange-400";
  }
  return "text-emerald-600 dark:text-emerald-400";
}

export const ScreeningResultQuestionItem = memo(
  function ScreeningResultQuestionItem({
    answer,
    displayIndex,
    totalQuestions,
  }: {
    answer: LastRunAnswer;
    displayIndex: number;
    totalQuestions: number;
  }) {
    const hasScore = answer.score != null && Number.isFinite(answer.score);
    const scoreDisplay = hasScore ? `${answer.score}/10` : "—/10";

    return (
      <li className="mb-10 last:mb-0">
        <article className="flex gap-4">
          <div
            className="flex w-8 shrink-0 flex-col items-start pt-0.5"
            aria-hidden
          >
            <span className="text-muted-foreground font-mono text-[11px] font-semibold tabular-nums">
              {String(displayIndex).padStart(2, "0")}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide">
                  Question {displayIndex} of {totalQuestions}
                </p>
                <h3 className="text-foreground max-w-[60ch] text-[15px] leading-snug font-semibold tracking-tight text-pretty">
                  {answer.question}
                </h3>
              </div>
              <div
                className="flex shrink-0 flex-col items-end"
                aria-label={
                  hasScore
                    ? `Score ${answer.score} out of 10`
                    : "Score not available"
                }
              >
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
                  Score
                </span>
                <span
                  className={cn(
                    "font-mono text-lg leading-none font-semibold tabular-nums",
                    hasScore
                      ? scoreDisplayClass(Number(answer.score))
                      : "text-muted-foreground",
                  )}
                >
                  {scoreDisplay}
                </span>
              </div>
            </div>

            <div className="border-border/20 border-l-2 pl-3">
              <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide">
                Rationale
              </p>
              <p className="text-foreground max-w-[68ch] text-sm leading-relaxed whitespace-pre-wrap">
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
  },
);
