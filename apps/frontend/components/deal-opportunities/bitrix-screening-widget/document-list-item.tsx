import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentStatusIcon } from "./document-status-icon";
import type { DealDocumentRow } from "./types";
import { INGEST_IN_FLIGHT, ingestionStatusLabel } from "./utils";

/**
 * Compact, untinted list row for a deal document. State is communicated via
 * the leading status icon and the trailing status label's color—no background
 * fills, no card borders.
 */
export function DocumentListItem({
  doc,
  variant,
  deletingDisabled,
  onDelete,
}: {
  doc: DealDocumentRow;
  variant: "processed" | "pending";
  deletingDisabled: boolean;
  onDelete: (doc: DealDocumentRow) => void;
}) {
  const isProcessed = variant === "processed";
  return (
    <li className="group/row flex flex-wrap items-start justify-between gap-2 py-2.5 text-[13px]">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="mt-0.5">
          <DocumentStatusIcon status={doc.ingestionStatus} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-foreground block truncate leading-snug">
            {doc.fileName}
          </span>
          {!isProcessed && doc.ingestionError ? (
            <p className="text-destructive mt-1 text-[11px] leading-snug whitespace-pre-wrap">
              {doc.ingestionError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "text-[11px] font-medium tabular-nums",
            isProcessed && "text-emerald-700 dark:text-emerald-400",
            !isProcessed &&
              INGEST_IN_FLIGHT.has(doc.ingestionStatus) &&
              "text-amber-800 dark:text-amber-300",
            !isProcessed &&
              doc.ingestionStatus === "FAILED" &&
              "text-destructive",
            !isProcessed &&
              doc.ingestionStatus === "SKIPPED" &&
              "text-muted-foreground",
          )}
        >
          {ingestionStatusLabel(doc.ingestionStatus)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground hover:text-destructive size-7 cursor-pointer",
            "opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100",
          )}
          disabled={deletingDisabled}
          aria-label={`Delete ${doc.fileName}`}
          onClick={() => onDelete(doc)}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
