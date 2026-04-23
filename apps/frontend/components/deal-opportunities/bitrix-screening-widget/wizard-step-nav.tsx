import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep } from "./types";

const STEP_META: {
  id: WizardStep;
  title: string;
  hint: string;
}[] = [
  { id: 1, title: "Documents", hint: "Mode & files" },
  { id: 2, title: "Screener", hint: "Choose template" },
  { id: 3, title: "Results", hint: "Runs & answers" },
];

/**
 * Minimal stepper: a hairline baseline with segments per step. Current step is
 * marked with a 2px primary underline and strong text. Done steps show a check
 * glyph before the title. No filled pills, no circled numbers.
 */
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
    <nav aria-label="Screening steps" className="border-border/60 border-b">
      <ol className="grid grid-cols-3 gap-2">
        {STEP_META.map((it) => {
          const active = step === it.id;
          const done = step > it.id;
          const locked = it.id === 2 && !canOpenStep2;
          return (
            <li key={it.id} className="min-w-0">
              <button
                type="button"
                disabled={locked}
                onClick={() => onStepChange(it.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group relative flex w-full min-w-0 cursor-pointer items-baseline gap-2 py-3 text-left",
                  "focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold tabular-nums",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  0{it.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-[13px] font-medium tracking-tight transition-colors",
                      active
                        ? "text-foreground"
                        : done
                          ? "text-foreground/80"
                          : "text-muted-foreground group-hover:text-foreground/80",
                    )}
                  >
                    {done ? (
                      <Check
                        className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden
                      />
                    ) : null}
                    {it.title}
                  </span>
                  <span className="text-muted-foreground mt-0.5 hidden text-[11px] leading-snug sm:block">
                    {it.hint}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "absolute -bottom-px left-0 h-[2px] w-full transition-colors",
                    active
                      ? "bg-foreground"
                      : "bg-transparent group-hover:bg-border",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
