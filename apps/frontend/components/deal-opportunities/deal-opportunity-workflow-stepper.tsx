import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DealOpportunityWorkflowStepId = 1 | 2 | 3;

export type DealOpportunityWorkflowStepDef = {
  step: DealOpportunityWorkflowStepId;
  label: string;
  description: string;
  icon: LucideIcon;
};

type Props = {
  steps: DealOpportunityWorkflowStepDef[];
  current: DealOpportunityWorkflowStepId;
  onStepChange: (s: DealOpportunityWorkflowStepId) => void;
  canNavigateTo: (s: DealOpportunityWorkflowStepId) => boolean;
  /** Shown when a step button is disabled (native `title`). */
  stepDisabledTitle?: (s: DealOpportunityWorkflowStepId) => string | undefined;
};

export function DealOpportunityWorkflowStepper({
  steps,
  current,
  onStepChange,
  canNavigateTo,
  stepDisabledTitle,
}: Props) {
  return (
    <nav
      aria-label="Workflow steps"
      className="bg-muted/25 ring-border/60 mb-3 rounded-xl p-2 ring-1 sm:mb-4 sm:p-2.5"
    >
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {steps.map(({ step: wizardStep, label, description, icon: Icon }, i) => {
          const isActive = current === wizardStep;
          const isDone = current > wizardStep;
          const canClick = canNavigateTo(wizardStep);
          const disabledReason = !canClick
            ? stepDisabledTitle?.(wizardStep)
            : undefined;
          return (
            <li
              key={wizardStep}
              className={cn(
                "relative flex min-w-0 flex-1",
                i > 0 &&
                  "sm:before:bg-border sm:before:absolute sm:before:top-1/2 sm:before:right-full sm:before:z-0 sm:before:h-px sm:before:w-[calc(50%-1.25rem)] sm:before:-translate-y-1/2",
              )}
            >
              <button
                type="button"
                disabled={!canClick}
                title={disabledReason}
                onClick={() => canClick && onStepChange(wizardStep)}
                className={cn(
                  "focus-visible:ring-ring flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-lg p-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2.5 sm:p-2.5",
                  isActive &&
                    "bg-primary/8 ring-primary/35 shadow-sm ring-1 sm:mx-0.5",
                  !isActive && canClick && "hover:bg-muted/60",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors sm:size-9",
                    isDone && "bg-primary text-primary-foreground",
                    isActive &&
                      !isDone &&
                      "bg-primary text-primary-foreground shadow-sm",
                    !isActive &&
                      !isDone &&
                      "bg-muted text-muted-foreground ring-1 ring-inset",
                  )}
                >
                  {isDone ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Icon className="size-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="text-foreground block text-xs leading-tight font-medium sm:text-sm">
                    {label}
                  </span>
                  <span className="text-muted-foreground mt-0.5 hidden text-[11px] leading-snug sm:block sm:text-xs">
                    {description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
