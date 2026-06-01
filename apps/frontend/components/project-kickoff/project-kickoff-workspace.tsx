import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { toast } from "sonner";
import {
  BarChart2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PROJECT_DEPARTMENTS, projectKickoffExtractionSchema } from "@repo/schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function arrToLines(v: unknown): string {
  if (Array.isArray(v))
    return (v as unknown[]).filter(Boolean).map(String).join("\n");
  if (typeof v === "string") return v;
  return "";
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function raciToText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return (v as Record<string, unknown>[])
    .map(
      (row) =>
        `${str(row.area)}:\n  R: ${str(row.responsible) || "—"}\n  A: ${str(row.accountable) || "—"}\n  C: ${str(row.consulted) || "—"}\n  I: ${str(row.informed) || "—"}`,
    )
    .join("\n\n");
}

function timelineToText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return (v as Record<string, unknown>[])
    .map(
      (row) =>
        `${str(row.milestone)} — ${str(row.targetDate) || "TBD"} [${str(row.status) || "?"}]`,
    )
    .join("\n");
}

function dodToText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return (v as Record<string, unknown>[])
    .map((row) => {
      const criteria = Array.isArray(row.criteria)
        ? (row.criteria as unknown[]).map((c) => `  • ${String(c)}`).join("\n")
        : "";
      return `${str(row.milestone)}:\n${criteria}`;
    })
    .join("\n\n");
}

// ─── types ───────────────────────────────────────────────────────────────────

type ReviewDraft = {
  projectName: string;
  department: string;
  projectOwners: string;
  productDirection: string;
  engineeringLead: string;
  objectives: string;
  platformEnables: string;
  keyDeliverables: string;
  risksAndBlockers: string;
  raciMatrix: string;
  timeline: string;
  chosenTool: string;
  techStack: string;
  definitionOfDone: string;
  additionalNotes: string;
};

type WorkflowStep = 1 | 2 | 3 | 4;

// ─── draft conversion ────────────────────────────────────────────────────────

function extractionToDraft(o: Record<string, unknown>): ReviewDraft | null {
  const projectName =
    typeof o.projectName === "string" ? o.projectName.trim() : "";
  if (!projectName) return null;
  return {
    projectName,
    department: str(o.department),
    projectOwners: arrToLines(o.projectOwners),
    productDirection: arrToLines(o.productDirection),
    engineeringLead: str(o.engineeringLead),
    objectives: str(o.objectives),
    platformEnables: arrToLines(o.platformEnables),
    keyDeliverables: arrToLines(o.keyDeliverables),
    risksAndBlockers: arrToLines(o.risksAndBlockers),
    raciMatrix: raciToText(o.raciMatrix),
    timeline: timelineToText(o.timeline),
    chosenTool: str(o.chosenTool),
    techStack: str(o.techStack),
    definitionOfDone: dodToText(o.definitionOfDone),
    additionalNotes: str(o.additionalNotes),
  };
}

// ─── validation ──────────────────────────────────────────────────────────────

function collectStep2ValidationMessages(d: ReviewDraft): string[] {
  const msgs: string[] = [];
  if (!d.projectName.trim()) msgs.push("Please enter a project name.");
  if (!d.objectives.trim()) msgs.push("Please enter project objectives.");
  return msgs;
}

function isDraftReady(d: ReviewDraft): boolean {
  return collectStep2ValidationMessages(d).length === 0;
}

function step2InvalidFieldRing(
  highlight: boolean,
  fieldInvalid: boolean,
): string | undefined {
  return highlight && fieldInvalid
    ? "ring-2 ring-destructive border-destructive"
    : undefined;
}

// ─── small UI components ─────────────────────────────────────────────────────

function FieldLabel({
  children,
  required: isRequired,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-muted-foreground text-xs leading-snug font-medium">
      {children}
      {isRequired ? (
        <span className="text-destructive ml-0.5" aria-hidden>
          *
        </span>
      ) : null}
    </span>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border/60 grid gap-1 border-b py-2 last:border-b-0 sm:grid-cols-[minmax(0,160px)_1fr] sm:gap-3 sm:py-2 md:grid-cols-[minmax(0,200px)_1fr]">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase sm:pt-0.5">
        {label}
      </div>
      <div className="text-foreground min-w-0 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

// ─── stepper ─────────────────────────────────────────────────────────────────

const WORKFLOW_STEPS: {
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
    label: "Final confirmation",
    description: "Confirm & save",
    icon: ShieldCheck,
  },
  {
    step: 4,
    label: "Project screening",
    description: "AI evaluation",
    icon: BarChart2,
  },
];

function WorkflowStepper({
  current,
  hasDraft,
  onStepChange,
}: {
  current: WorkflowStep;
  hasDraft: boolean;
  onStepChange: (s: WorkflowStep) => void;
}) {
  return (
    <nav
      aria-label="Workflow steps"
      className="bg-muted/25 ring-border/60 mb-3 rounded-xl p-2 ring-1 sm:mb-4 sm:p-2.5"
    >
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {WORKFLOW_STEPS.map(
          ({ step: wizardStep, label, description, icon: Icon }, i) => {
            const isActive = current === wizardStep;
            const isDone = current > wizardStep;
            const canClick =
              wizardStep === 1 ||
              (wizardStep === 2 && hasDraft) ||
              (wizardStep === 3 && current === 3) ||
              (wizardStep === 4 && current === 4);
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
                  title={
                    wizardStep === 3 && current !== 3
                      ? "Use Continue on Review fields to open this step"
                      : undefined
                  }
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
          },
        )}
      </ol>
    </nav>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ProjectKickoffWorkspace() {
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [step, setStep] = useState<WorkflowStep>(1);
  const [step2ContinueAttempted, setStep2ContinueAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [screeningState, setScreeningState] = useState<
    "idle" | "polling" | "completed" | "failed"
  >("idle");
  const [screeningProgress, setScreeningProgress] = useState<{
    step: string;
    percentage: number;
  } | null>(null);
  const [screeningResult, setScreeningResult] = useState<{
    score: number;
    analysis: string;
  } | null>(null);

  useEffect(() => {
    if (!draft && step !== 1) setStep(1);
  }, [draft, step]);

  useEffect(() => {
    if (step !== 2) setStep2ContinueAttempted(false);
  }, [step]);

  const { object, submit, isLoading, error, clear, stop } = useObject({
    api: "/api/project-kickoff/extract",
    schema: projectKickoffExtractionSchema,
    credentials: "include",
    onFinish: ({ object: finished, error: finishErr }) => {
      if (finishErr) {
        toast.error(finishErr.message || "Extraction did not match schema");
        return;
      }
      if (!finished) {
        toast.error("No structured data returned");
        return;
      }
      const next = extractionToDraft(finished as Record<string, unknown>);
      if (!next) {
        toast.error("Project name is required in the extraction result");
        return;
      }
      setDraft(next);
      setStep(2);
      toast.success("Extraction complete — review fields below");
    },
  });

  // Poll the screening job status every 5 s while in "polling" state.
  // Stops automatically when screeningState changes to "completed" or "failed".
  useEffect(() => {
    if (!jobId || screeningState !== "polling") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/project-kickoff/status/${jobId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          state: "waiting" | "active" | "completed" | "failed";
          progress: { step: string; percentage: number } | null;
          result: { score: number; analysis: string } | null;
        };

        if (data.progress) setScreeningProgress(data.progress);

        if (data.state === "completed" && data.result) {
          setScreeningResult(data.result);
          setScreeningState("completed");
        } else if (data.state === "failed") {
          setScreeningState("failed");
          toast.error(
            "AI screening failed. Your project was saved — go back to retry.",
          );
        }
      } catch {
        // network hiccup — silently retry next interval
      }
    };

    poll(); // fire immediately so the user doesn't wait 5 s for the first update
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [jobId, screeningState]);

  const canExtract = rawText.trim().length > 0 && !isLoading;
  const draftReady = draft != null && isDraftReady(draft);
  const step2HighlightInvalidFields =
    step === 2 &&
    step2ContinueAttempted &&
    draft != null &&
    !isDraftReady(draft);

  const onConfirm = useCallback(async () => {
    if (!draft || !isDraftReady(draft)) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/project-kickoff/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, rawText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(
          (err as { error?: string }).error ?? "Failed to save project",
        );
        return;
      }
      const { jobId: newJobId } = (await res.json()) as {
        projectId: string;
        jobId: string;
      };
      setJobId(newJobId);
      setScreeningState("polling");
      setStep(4);
      toast.success("Project saved — AI screening in progress");
    } finally {
      setIsSaving(false);
    }
  }, [draft, rawText]);

  const showFieldGrid = step === 2 && !!draft;

  return (
    <div className="mx-auto w-full max-w-5xl px-2 pb-10 sm:px-4 sm:pb-12">
      <header className="mb-3 space-y-1 sm:mb-4">
        <h1 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight sm:gap-2.5 sm:text-xl md:text-2xl">
          <Sparkles
            className="text-primary size-5 shrink-0 sm:size-6 md:size-7"
            aria-hidden
          />
          AI → Project Kickoff
        </h1>
        <p className="text-muted-foreground max-w-lg text-xs leading-snug sm:text-sm sm:leading-relaxed">
          Paste project kickoff text, refine extracted fields, then confirm
          before saving.
        </p>
      </header>

      <WorkflowStepper
        current={step}
        hasDraft={!!draft}
        onStepChange={setStep}
      />

      <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        {(step === 1 || step === 2) && (
          <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col overflow-hidden rounded-xl ring-1">
            <div className="border-border/50 space-y-0.5 border-b px-3 py-2 sm:px-4">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                {step === 1 ? "Paste raw project text" : "Review & edit fields"}
              </h2>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs sm:leading-relaxed">
                {step === 1
                  ? "Meeting notes, kickoff document, email thread — then run Extract."
                  : "Adjust extracted values before saving."}
              </p>
            </div>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4",
                "max-h-[min(68dvh,520px)] sm:max-h-[min(70dvh,580px)] lg:max-h-[min(72dvh,640px)]",
                showFieldGrid || (step === 1 && (isLoading || error))
                  ? "overflow-y-auto overscroll-contain"
                  : step === 1
                    ? "items-center justify-center"
                    : "overflow-y-auto overscroll-contain",
              )}
            >
              {/* ── Step 1: paste + extract ── */}
              {step === 1 ? (
                <>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste project kickoff text…"
                    className="min-h-[100px] w-full shrink-0 resize-y text-sm leading-snug sm:min-h-[120px] sm:leading-relaxed md:min-h-[140px] md:text-[15px]"
                    disabled={isLoading}
                    aria-label="Raw project text"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canExtract}
                      onClick={() => submit({ rawText })}
                      className="gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Extracting…
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          Extract
                        </>
                      )}
                    </Button>
                    {isLoading ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => stop()}
                      >
                        Stop
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => {
                        clear();
                        setDraft(null);
                        setRawText("");
                        setStep(1);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  {error ? (
                    <p className="text-destructive text-sm" role="alert">
                      {error.message}
                    </p>
                  ) : null}
                </>
              ) : null}

              {step === 1 && isLoading ? (
                <div
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                  aria-live="polite"
                >
                  <Loader2
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Extracting project fields…
                </div>
              ) : null}

              {step === 1 && !isLoading && !rawText.trim() ? (
                <div className="text-muted-foreground flex max-w-[220px] flex-col items-center gap-2 px-2 text-center text-xs sm:text-sm">
                  <Sparkles
                    className="size-7 opacity-[0.35] sm:size-8"
                    aria-hidden
                    strokeWidth={1.25}
                  />
                  <p className="leading-snug">
                    Add source text, then run{" "}
                    <span className="font-medium">Extract</span>.
                  </p>
                </div>
              ) : null}

              {/* ── Step 2: field grid ── */}
              {showFieldGrid && (
                <div className="grid w-full gap-2.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2.5">

                  {/* Project name */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel required>Project name</FieldLabel>
                    <Input
                      value={draft.projectName}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, projectName: e.target.value } : d,
                        )
                      }
                      className={cn(
                        step2InvalidFieldRing(
                          step2HighlightInvalidFields,
                          !draft.projectName.trim(),
                        ),
                      )}
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Department</FieldLabel>
                    <Select
                      value={draft.department || ""}
                      onValueChange={(v) =>
                        setDraft((d) => (d ? { ...d, department: v } : d))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project owners */}
                  <div className="space-y-1">
                    <FieldLabel>Project owners</FieldLabel>
                    <Input
                      value={draft.projectOwners}
                      placeholder="Comma-separated names"
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, projectOwners: e.target.value } : d,
                        )
                      }
                    />
                  </div>

                  {/* Engineering lead */}
                  <div className="space-y-1">
                    <FieldLabel>Engineering lead</FieldLabel>
                    <Input
                      value={draft.engineeringLead}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, engineeringLead: e.target.value } : d,
                        )
                      }
                    />
                  </div>

                  {/* Product direction */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Product direction</FieldLabel>
                    <Input
                      value={draft.productDirection}
                      placeholder="Comma-separated names"
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, productDirection: e.target.value } : d,
                        )
                      }
                    />
                  </div>

                  {/* Chosen tool */}
                  <div className="space-y-1">
                    <FieldLabel>Chosen tool / board</FieldLabel>
                    <Input
                      value={draft.chosenTool}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, chosenTool: e.target.value } : d,
                        )
                      }
                    />
                  </div>

                  {/* Tech stack */}
                  <div className="space-y-1">
                    <FieldLabel>Tech stack</FieldLabel>
                    <Input
                      value={draft.techStack}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, techStack: e.target.value } : d,
                        )
                      }
                    />
                  </div>

                  <Separator className="my-1.5 sm:col-span-2" />

                  {/* Objectives */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel required>Objectives</FieldLabel>
                    <Textarea
                      rows={4}
                      value={draft.objectives}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, objectives: e.target.value } : d,
                        )
                      }
                      className={cn(
                        "text-sm",
                        step2InvalidFieldRing(
                          step2HighlightInvalidFields,
                          !draft.objectives.trim(),
                        ),
                      )}
                    />
                  </div>

                  {/* Platform enables */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Platform enables (one per line)</FieldLabel>
                    <Textarea
                      rows={5}
                      value={draft.platformEnables}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, platformEnables: e.target.value } : d,
                        )
                      }
                      className="text-sm"
                    />
                  </div>

                  {/* Key deliverables */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Key deliverables (one per line)</FieldLabel>
                    <Textarea
                      rows={5}
                      value={draft.keyDeliverables}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, keyDeliverables: e.target.value } : d,
                        )
                      }
                      className="text-sm"
                    />
                  </div>

                  <Separator className="my-1.5 sm:col-span-2" />

                  {/* RACI matrix */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>RACI matrix</FieldLabel>
                    <Textarea
                      rows={8}
                      value={draft.raciMatrix}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, raciMatrix: e.target.value } : d,
                        )
                      }
                      className="font-mono text-xs sm:text-sm"
                    />
                  </div>

                  {/* Risks & blockers */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Risks & blockers (one per line)</FieldLabel>
                    <Textarea
                      rows={4}
                      value={draft.risksAndBlockers}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, risksAndBlockers: e.target.value } : d,
                        )
                      }
                      className="text-sm"
                    />
                  </div>

                  {/* Timeline */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>High-level timeline</FieldLabel>
                    <Textarea
                      rows={6}
                      value={draft.timeline}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, timeline: e.target.value } : d,
                        )
                      }
                      className="font-mono text-xs sm:text-sm"
                    />
                  </div>

                  {/* Definition of done */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Definition of done</FieldLabel>
                    <Textarea
                      rows={6}
                      value={draft.definitionOfDone}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, definitionOfDone: e.target.value } : d,
                        )
                      }
                      className="text-sm"
                    />
                  </div>

                  {/* Additional notes */}
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>Additional notes / future work</FieldLabel>
                    <Textarea
                      rows={3}
                      value={draft.additionalNotes}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, additionalNotes: e.target.value } : d,
                        )
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2 footer: validation + navigation ── */}
              {step === 2 && draft && !isLoading ? (
                <div className="border-border/50 mt-3 w-full min-w-0 space-y-3 border-t pt-3">
                  {!draftReady ? (
                    <Alert
                      id="step2-validation-messages"
                      variant="destructive"
                      className={cn(
                        "py-2.5",
                        step2ContinueAttempted && "ring-destructive/80 ring-2",
                      )}
                    >
                      <AlertTitle className="text-sm">
                        Complete required fields
                      </AlertTitle>
                      <AlertDescription className="text-xs sm:text-sm">
                        <ul className="marker:text-destructive mt-2 list-disc space-y-1 pl-4">
                          {collectStep2ValidationMessages(draft).map(
                            (msg, i) => (
                              <li key={`${msg}-${i}`}>{msg}</li>
                            ),
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="gap-2"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!draft) return;
                        if (!isDraftReady(draft)) {
                          setStep2ContinueAttempted(true);
                          toast.error(
                            "Fill in the required fields above before continuing.",
                          );
                          return;
                        }
                        setStep2ContinueAttempted(false);
                        setStep(3);
                      }}
                      className="gap-2"
                      aria-describedby={
                        !draftReady && step2ContinueAttempted
                          ? "step2-validation-messages"
                          : undefined
                      }
                    >
                      Continue to final confirmation
                      <ChevronRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* ── Step 3: final confirmation ── */}
        {step === 3 && draft ? (
          <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col overflow-hidden rounded-xl ring-1">
            <div className="border-border/50 space-y-0.5 border-b px-3 py-2 sm:px-4">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                Final confirmation
              </h2>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs sm:leading-relaxed">
                Review everything below before saving the project kickoff.
              </p>
            </div>
            <div className="flex max-h-[min(75dvh,640px)] flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
              <div className="border-border/50 rounded-lg border px-2 sm:px-3">
                <SummaryRow label="Project name">{draft.projectName}</SummaryRow>
                <SummaryRow label="Department">
                  {draft.department || "—"}
                </SummaryRow>
                <SummaryRow label="Project owners">
                  {draft.projectOwners || "—"}
                </SummaryRow>
                <SummaryRow label="Engineering lead">
                  {draft.engineeringLead || "—"}
                </SummaryRow>
                <SummaryRow label="Product direction">
                  {draft.productDirection || "—"}
                </SummaryRow>
                <SummaryRow label="Chosen tool">
                  {draft.chosenTool || "—"}
                </SummaryRow>
                <SummaryRow label="Tech stack">
                  {draft.techStack || "—"}
                </SummaryRow>
                <SummaryRow label="Objectives">
                  <span className="whitespace-pre-wrap">
                    {draft.objectives || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Platform enables">
                  <span className="whitespace-pre-wrap">
                    {draft.platformEnables || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Key deliverables">
                  <span className="whitespace-pre-wrap">
                    {draft.keyDeliverables || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="RACI matrix">
                  <span className="whitespace-pre-wrap font-mono text-xs">
                    {draft.raciMatrix || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Risks & blockers">
                  <span className="whitespace-pre-wrap">
                    {draft.risksAndBlockers || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Timeline">
                  <span className="whitespace-pre-wrap font-mono text-xs">
                    {draft.timeline || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Definition of done">
                  <span className="whitespace-pre-wrap">
                    {draft.definitionOfDone || "—"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Additional notes">
                  <span className="whitespace-pre-wrap">
                    {draft.additionalNotes || "—"}
                  </span>
                </SummaryRow>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back to review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || !draftReady}
                  onClick={() => void onConfirm()}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save project kickoff
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Step 4: AI screening results ── */}
        {step === 4 ? (
          <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col overflow-hidden rounded-xl ring-1">
            <div className="border-border/50 space-y-0.5 border-b px-3 py-2 sm:px-4">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                Project screening
              </h2>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs sm:leading-relaxed">
                AI is evaluating your project against department criteria.
              </p>
            </div>

            <div className="flex flex-col gap-4 p-3 sm:p-4">
              {/* ── Polling: spinner + progress bar ── */}
              {screeningState === "polling" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2
                      className="text-primary size-4 animate-spin"
                      aria-hidden
                    />
                    <span>Screening in progress…</span>
                  </div>
                  {screeningProgress ? (
                    <div className="space-y-1.5">
                      <div className="text-muted-foreground flex justify-between text-xs">
                        <span>{screeningProgress.step}</span>
                        <span>{screeningProgress.percentage}%</span>
                      </div>
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${screeningProgress.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Completed: score + analysis ── */}
              {screeningState === "completed" && screeningResult ? (
                <div className="flex flex-col gap-4">
                  {/* Score number */}
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "tabular-nums text-5xl font-bold",
                        screeningResult.score >= 3.5
                          ? "text-green-600"
                          : screeningResult.score >= 2
                            ? "text-amber-500"
                            : "text-red-500",
                      )}
                    >
                      {screeningResult.score.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-xl">/ 5</span>
                  </div>

                  {/* Verdict badge */}
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      screeningResult.score >= 3.5
                        ? "bg-green-100 text-green-800"
                        : screeningResult.score >= 2
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800",
                    )}
                  >
                    {screeningResult.score >= 3.5
                      ? "Worth taking"
                      : screeningResult.score >= 2
                        ? "Review needed"
                        : "Not recommended"}
                  </span>

                  {/* Analysis text */}
                  <p className="text-foreground text-sm leading-relaxed">
                    {screeningResult.analysis}
                  </p>
                </div>
              ) : null}

              {/* ── Failed: error + back button ── */}
              {screeningState === "failed" && (
                <div className="space-y-3">
                  <p className="text-destructive text-sm">
                    Screening failed. Your project was saved but evaluation did
                    not complete.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setScreeningState("idle");
                      setStep(3);
                    }}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Go back and retry
                  </Button>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
