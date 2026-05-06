import { Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { DisplayIngestionPipelineRow } from "./types";

export function IngestionProgressList({
  rows,
  onCancelRow,
  cancellingKeys,
}: {
  rows: DisplayIngestionPipelineRow[];
  onCancelRow?: (row: DisplayIngestionPipelineRow) => void;
  cancellingKeys?: ReadonlySet<string>;
}) {
  if (rows.length === 0) return null;

  return (
    <ul className="divide-border/20 divide-y">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1 py-2 text-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-foreground min-w-0 truncate font-medium">
              {row.fileName ?? "—"}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground text-[11px] font-medium">
                {row.phaseLabel}
              </span>
              {onCancelRow && (row.cancelInstanceId || row.fileName) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 cursor-pointer px-2 text-[11px]"
                  disabled={Boolean(cancellingKeys?.has(row.key))}
                  onClick={() => onCancelRow(row)}
                >
                  {cancellingKeys?.has(row.key) ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <XCircle className="size-3.5 shrink-0" aria-hidden />
                  )}
                  Stop
                </Button>
              ) : null}
            </div>
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
            className="h-1"
            aria-label={`${row.fileName ?? "file"} ${row.phaseLabel}`}
          />
        </li>
      ))}
    </ul>
  );
}
