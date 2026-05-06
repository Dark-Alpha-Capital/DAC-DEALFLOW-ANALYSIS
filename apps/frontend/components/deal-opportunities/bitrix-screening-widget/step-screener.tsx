import { Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetBootstrap } from "./types";

type Screener = WidgetBootstrap["screeners"][number];
type RagDocRow = WidgetBootstrap["dealDocuments"][number];

const MODE_LABEL: Record<string, string> = {
  monograph: "Single-file (monograph)",
  rag: "Multi-file (RAG)",
};

export function StepScreener({
  screeners,
  effectiveScreenerId,
  onScreenerIdChange,
  screeningModeBadge,
  indexedCount,
  vectorWaitSec,
  ragDocuments,
  selectedDocumentIdsForScreening,
  onToggleScreeningDocument,
  canRunNow,
  runPending,
  blockedReason,
  onStartScreening,
}: {
  screeners: Screener[];
  effectiveScreenerId: string;
  onScreenerIdChange: (id: string) => void;
  screeningModeBadge: string | null;
  indexedCount: number;
  vectorWaitSec: number;
  ragDocuments: RagDocRow[] | null;
  selectedDocumentIdsForScreening: string[];
  onToggleScreeningDocument: (documentId: string, checked: boolean) => void;
  canRunNow: boolean;
  runPending: boolean;
  blockedReason: string | null;
  onStartScreening: () => void;
}) {
  const showRagPicker =
    ragDocuments != null &&
    ragDocuments.length > 0 &&
    screeningModeBadge === "rag";

  const selectedCount = selectedDocumentIdsForScreening.length;

  return (
    <section aria-labelledby="step-screener-title">
      <div className="space-y-5">
        <div className="space-y-1">
          <h2
            id="step-screener-title"
            className="text-lg font-semibold tracking-[-0.01em]"
          >
            Run screening
          </h2>
          <p className="text-muted-foreground max-w-[56ch] text-sm leading-relaxed">
            Choose a screener template and start.{" "}
            {screeningModeBadge ? (
              <>
                <Badge
                  variant="outline"
                  className="border-border/20 text-xs font-medium"
                >
                  {MODE_LABEL[screeningModeBadge] ?? screeningModeBadge}
                </Badge>{" "}
                · {indexedCount} chunk{indexedCount === 1 ? "" : "s"} indexed.
                Server waits {vectorWaitSec}s for the vector index.
              </>
            ) : (
              <>
                {indexedCount} chunk{indexedCount === 1 ? "" : "s"} indexed.
                After start, the server waits {vectorWaitSec}s for the vector
                index.
              </>
            )}
          </p>
        </div>

        <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
          <p className="text-foreground text-xs font-medium tracking-tight">
            Screener template
          </p>
          <Select value={effectiveScreenerId} onValueChange={onScreenerIdChange}>
            <SelectTrigger
              id="bitrix-widget-screener"
              className="cursor-pointer"
            >
              <SelectValue placeholder="Choose screener" />
            </SelectTrigger>
            <SelectContent>
              {screeners.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showRagPicker ? (
          <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-3">
            <div className="space-y-0.5">
              <p className="text-foreground text-xs font-medium tracking-tight">
                Documents to screen
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Chunks from selected files only are sent to the screener ({selectedCount}{" "}
                of {ragDocuments.length} file{ragDocuments.length === 1 ? "" : "s"}
                ).
              </p>
            </div>
            <ul className="max-h-48 space-y-2 overflow-y-auto pr-1" role="list">
              {ragDocuments.map((doc) => {
                const checked = selectedDocumentIdsForScreening.includes(doc.id);
                return (
                  <li key={doc.id}>
                    <label className="hover:bg-muted/30 flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-1 py-1.5">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          onToggleScreeningDocument(doc.id, v === true)
                        }
                        className="mt-0.5"
                        aria-describedby={`bitrix-screen-doc-${doc.id}-name`}
                      />
                      <span
                        id={`bitrix-screen-doc-${doc.id}-name`}
                        className="text-foreground min-w-0 flex-1 text-[13px] leading-snug wrap-break-word"
                      >
                        {doc.fileName}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="border-border/20 bg-muted/10 rounded-lg border p-3 space-y-2">
          <Button
            type="button"
            disabled={!canRunNow}
            className="cursor-pointer transition-transform active:scale-[0.98]"
            onClick={onStartScreening}
          >
            {runPending ? (
              <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            Start screening
          </Button>
          <p
            className={
              canRunNow
                ? "text-muted-foreground text-xs leading-relaxed"
                : "text-destructive text-[13px] leading-relaxed"
            }
            role="status"
          >
            {canRunNow ? "Ready to run." : (blockedReason ?? "")}
          </p>
        </div>
      </div>
    </section>
  );
}
