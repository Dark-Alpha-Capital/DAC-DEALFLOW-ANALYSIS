import { Loader2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepHeaderNav } from "./step-header-nav";
import type { WidgetBootstrap, WizardStep } from "./types";

type Screener = WidgetBootstrap["screeners"][number];

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
  canRunNow,
  runPending,
  blockedReason,
  onStartScreening,
  goStep,
}: {
  screeners: Screener[];
  effectiveScreenerId: string;
  onScreenerIdChange: (id: string) => void;
  screeningModeBadge: string | null;
  indexedCount: number;
  vectorWaitSec: number;
  canRunNow: boolean;
  runPending: boolean;
  blockedReason: string | null;
  onStartScreening: () => void;
  goStep: (s: WizardStep) => void;
}) {
  return (
    <section aria-labelledby="step-screener-title">
      <StepHeaderNav
        stepLabel="Step 2 of 3 · Screener"
        back={{ label: "Documents", onClick: () => goStep(1) }}
        next={{ label: "View results", onClick: () => goStep(3) }}
      />

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
                <Badge variant="outline" className="border-border/20 text-xs font-medium">
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
