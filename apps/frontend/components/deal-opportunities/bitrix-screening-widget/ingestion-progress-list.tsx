import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { DisplayIngestionPipelineRow } from "./types";

export function IngestionProgressList({
  rows,
}: {
  rows: DisplayIngestionPipelineRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <ul className="divide-border/60 border-border/60 divide-y border-y">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1.5 py-2.5 text-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-foreground min-w-0 truncate font-medium">
              {row.fileName ?? "—"}
            </span>
            <span className="text-muted-foreground shrink-0 text-[11px] font-medium">
              {row.phaseLabel}
            </span>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2">
            <Loader2
              className="size-3 shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            <span>{row.progressStep}</span>
            <span className="font-mono text-[10px] tabular-nums">
              {row.progressPercent}%
            </span>
          </div>
          <Progress
            value={Math.min(100, Math.max(0, row.progressPercent))}
            className="h-[3px]"
            aria-label={`${row.fileName ?? "file"} ${row.phaseLabel}`}
          />
        </li>
      ))}
    </ul>
  );
}
