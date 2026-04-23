import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepHeaderNav } from "./step-header-nav";
import type { ScreeningMode, WidgetBootstrap, WizardStep } from "./types";

type Screener = WidgetBootstrap["screeners"][number];

export function StepScreener({
  screeners,
  effectiveScreenerId,
  onScreenerIdChange,
  screeningMode,
  indexedCount,
  vectorWaitSec,
  targetDocumentId,
  monographSelectedLabel,
  canRunNow,
  runPending,
  blockedReason,
  onStartScreening,
  goStep,
}: {
  screeners: Screener[];
  effectiveScreenerId: string;
  onScreenerIdChange: (id: string) => void;
  screeningMode: ScreeningMode;
  indexedCount: number;
  vectorWaitSec: number;
  targetDocumentId: string;
  monographSelectedLabel: string | null;
  canRunNow: boolean;
  runPending: boolean;
  blockedReason: string | null;
  onStartScreening: () => void;
  goStep: (s: WizardStep) => void;
}) {
  const modeLabel =
    screeningMode === "rag" ? "Deal RAG" : "Single-file (monograph)";

  return (
    <section aria-labelledby="step-screener-title">
      <StepHeaderNav
        stepLabel="Step 2 of 3 · Screener"
        back={{ label: "Documents", onClick: () => goStep(1) }}
        next={{ label: "View results", onClick: () => goStep(3) }}
      />

      <div className="space-y-10">
        <div className="space-y-2">
          <h2
            id="step-screener-title"
            className="text-lg font-semibold tracking-tight"
          >
            Run screening
          </h2>
          <p className="text-muted-foreground max-w-[62ch] text-[13px] leading-relaxed">
            Choose a screener template and start. Mode:{" "}
            <span className="text-foreground font-medium">{modeLabel}</span>
            {screeningMode === "rag"
              ? ` · ${indexedCount} chunk${indexedCount === 1 ? "" : "s"} indexed. After start, the server waits ${vectorWaitSec}s for the vector index.`
              : targetDocumentId
                ? ` · ${monographSelectedLabel ? `"${monographSelectedLabel}" — ` : ""}full text window per question (no retrieval).`
                : ""}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="bitrix-widget-screener"
            className="text-muted-foreground block text-[10px] font-semibold tracking-[0.16em] uppercase"
          >
            Screener
          </label>
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

        <div className="space-y-2">
          <Button
            type="button"
            disabled={!canRunNow}
            className="cursor-pointer"
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
