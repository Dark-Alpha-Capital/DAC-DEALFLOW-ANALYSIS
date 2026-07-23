import {
  Check,
  ClipboardPaste,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "./project-kickoff-draft-utils";

const BASE_STEPS: {
  step: WorkflowStep;
  label: string;
  description: string;
  icon: typeof ClipboardPaste;
}[] = [
  {
    step: 1,
    label: "Paste source",
    description: "Raw project text",
    icon: ClipboardPaste,
  },
  {
    step: 2,
    label: "Review fields",
    description: "Edit before saving",
    icon: PenLine,
  },
  {
    step: 3,
    label: "Confirm",
    description: "Verify & save",
    icon: ShieldCheck,
  },
];

const SCREENING_STEP = {
  step: 4 as const,
  label: "AI screening",
  description: "Score & sync to Plane",
  icon: Sparkles,
};

type WorkflowStepperProps = {
  current: WorkflowStep;
  hasDraft: boolean;
  onStepChange: (step: WorkflowStep) => void;
  /** Embed path keeps a 4th step open until screening sync finishes. */
  showScreeningStep?: boolean;
};

export function WorkflowStepper({
  current,
  hasDraft,
  onStepChange,
  showScreeningStep = false,
}: WorkflowStepperProps) {
  const steps = showScreeningStep
    ? [...BASE_STEPS, SCREENING_STEP]
    : BASE_STEPS;

  return (
    <nav
      aria-label="Workflow steps"
      className="border-border/60 rounded-lg border bg-[#FBFBFA] p-2"
    >
      <ol className="flex flex-col gap-1 sm:flex-row sm:items-stretch">
        {steps.map(({ step, label, description, icon: Icon }, index) => {
          const isActive = current === step;
          const isDone = current > step;
          const canClick =
            step === 1 ||
            (step === 2 && hasDraft && current < 4) ||
            (step === 3 && current === 3) ||
            (step === 4 && current === 4);

          return (
            <li key={step} className="relative min-w-0 flex-1">
              <button
                type="button"
                disabled={!canClick}
                title={
                  step === 3 && current !== 3
                    ? "Use Continue on Review fields to open this step"
                    : step === 4 && current !== 4
                      ? "Opens after save & Plane create"
                      : undefined
                }
                onClick={() => canClick && onStepChange(step)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md p-2.5 text-left transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  isActive && "border-border bg-background border",
                  !isActive && canClick && "hover:bg-muted/50",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums",
                    (isDone || isActive) && "bg-foreground text-background",
                    !isActive &&
                      !isDone &&
                      "bg-muted text-muted-foreground border-border border",
                  )}
                >
                  {isDone ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Icon className="size-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="text-foreground block text-xs font-medium sm:text-sm">
                    <span className="text-muted-foreground mr-1.5 font-mono text-[10px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {label}
                  </span>
                  <span className="text-muted-foreground mt-0.5 hidden text-xs sm:block">
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
