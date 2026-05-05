import { cn } from "@/lib/utils";
import type { WizardStep } from "./types";

const STEPS = [
  { id: 1 as WizardStep, label: "Documents" },
  { id: 2 as WizardStep, label: "Screener" },
  { id: 3 as WizardStep, label: "Results" },
];

export function WizardStepNav({
  step,
  onStepChange,
  canOpenStep2,
}: {
  step: WizardStep;
  onStepChange: (s: WizardStep) => void;
  canOpenStep2: boolean;
}) {
  return (
    <nav aria-label="Screening steps">
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {STEPS.map(({ id, label }) => {
          const active = step === id;
          const locked = id === 2 && !canOpenStep2;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={locked}
              onClick={() => onStepChange(id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-40",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {id}. {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
