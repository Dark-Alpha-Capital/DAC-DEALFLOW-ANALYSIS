import { BookMarked, ChevronDown } from "lucide-react";
import type { EvidenceCitation } from "@/lib/map-cim-screening-evidence";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatChunkIdForUi } from "./utils";

export function EvidenceChunksCollapsible({
  citations,
  chunkIds,
}: {
  citations: EvidenceCitation[];
  chunkIds: string[];
}) {
  const hitCount = citations.length > 0 ? citations.length : chunkIds.length;
  if (hitCount === 0) return null;

  return (
    <Collapsible defaultOpen={false} className="w-full">
      <CollapsibleTrigger
        type="button"
        className={cn(
          "group border-border/70 bg-muted/30 flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition-colors duration-200",
          "hover:bg-muted/45 focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "motion-reduce:transition-none",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <BookMarked className="text-primary/80 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="text-foreground text-sm font-semibold tracking-tight">
              Evidence
            </span>
            <span className="text-muted-foreground text-sm font-normal">
              {" · "}
              {hitCount} chunk hit{hitCount === 1 ? "" : "s"}
            </span>
          </span>
        </span>
        <ChevronDown
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 outline-none",
        )}
      >
        <div className="border-border/60 bg-background/70 mt-1.5 max-h-72 overflow-y-auto rounded-md border p-2 shadow-inner">
          {citations.length > 0 ? (
            <ol className="marker:text-muted-foreground list-decimal space-y-3 pl-3 text-xs leading-relaxed wrap-anywhere">
              {citations.map((c, idx) => (
                <li key={`${c.chunkId}-${idx}`} className="pl-1">
                  <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium tracking-wide uppercase">
                    <span>
                      {c.pageNumber != null
                        ? `Page ${c.pageNumber}`
                        : "Excerpt"}
                    </span>
                    <code className="bg-muted/90 text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-normal tracking-normal normal-case">
                      {formatChunkIdForUi(c.chunkId)}
                    </code>
                  </div>
                  {c.excerpt ? (
                    <p className="text-foreground max-w-prose text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
                      {c.excerpt}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-[0.8125rem] italic">
                      No stored text for chunk{" "}
                      <code className="bg-muted rounded px-1 font-mono text-[0.65rem] not-italic">
                        {formatChunkIdForUi(c.chunkId)}
                      </code>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground font-mono text-[11px] leading-relaxed">
              Chunk IDs: {chunkIds.map(formatChunkIdForUi).join(", ")}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
