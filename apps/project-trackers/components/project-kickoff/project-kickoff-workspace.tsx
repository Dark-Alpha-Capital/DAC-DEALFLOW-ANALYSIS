import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  draftToStructured,
  projectKickoffExtractionSchema,
} from "@repo/schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  buildPlaneProjectIdentifier,
  usePlaneEmbed,
} from "@/hooks/use-plane-embed";
import { ConfirmationSummary } from "./confirmation-summary";
import {
  collectStep2ValidationMessages,
  extractionToDraft,
  isDraftReady,
  toKickoffDraft,
  type ReviewDraft,
  type WorkflowStep,
} from "./project-kickoff-draft-utils";
import { ReviewDraftFields } from "./review-draft-fields";
import { WorkflowStepper } from "./workflow-stepper";
import { WorkspacePanel } from "./workspace-panel";

type ProjectKickoffWorkspaceProps = {
  /** When true (Plane iframe embed), skip auth-gated navigate and sync to Plane. */
  publicEmbed?: boolean;
  /** From `?workspaceSlug=` when Plane loads the iframe. */
  initialWorkspaceSlug?: string;
};

export function ProjectKickoffWorkspace({
  publicEmbed = false,
  initialWorkspaceSlug,
}: ProjectKickoffWorkspaceProps) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { ctx: planeCtx, createProject: createPlaneProject } = usePlaneEmbed(
    initialWorkspaceSlug,
  );
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [step, setStep] = useState<WorkflowStep>(1);
  const [step2ContinueAttempted, setStep2ContinueAttempted] = useState(false);
  const [isCreatingInPlane, setIsCreatingInPlane] = useState(false);

  const { mutateAsync: createKickoff, isPending: isSavingKickoff } = useMutation(
    trpc.projectKickoffs.create.mutationOptions(),
  );
  const isSaving = isSavingKickoff || isCreatingInPlane;

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
      toast.success("Extraction complete — review the fields below");
    },
  });

  useEffect(() => {
    if (!draft && step !== 1) setStep(1);
  }, [draft, step]);

  useEffect(() => {
    if (step !== 2) setStep2ContinueAttempted(false);
  }, [step]);

  const draftReady = draft != null && isDraftReady(draft);
  const canExtract = rawText.trim().length > 0 && !isLoading;
  const highlightInvalidFields =
    step === 2 &&
    step2ContinueAttempted &&
    draft != null &&
    !isDraftReady(draft);

  const resetWorkspace = useCallback(() => {
    clear();
    setDraft(null);
    setRawText("");
    setStep(1);
    setStep2ContinueAttempted(false);
  }, [clear]);

  const onConfirm = useCallback(async () => {
    if (!draft || !isDraftReady(draft)) return;
    try {
      const kickoffDraft = toKickoffDraft(draft);
      const created = await createKickoff({
        draft: kickoffDraft,
        rawText,
      });

      if (publicEmbed) {
        setIsCreatingInPlane(true);
        try {
          const structured = draftToStructured(kickoffDraft);
          const planeResult = await createPlaneProject(structured, {
            identifier: buildPlaneProjectIdentifier(structured.projectName),
            externalId: created.projectId,
          });

          if (planeResult.success) {
            toast.success(
              planeResult.project?.name
                ? `Saved and created in Plane: ${planeResult.project.name}`
                : "Saved and created in Plane",
            );
          } else {
            toast.warning(
              `Kickoff saved, but Plane create failed: ${planeResult.error ?? "Unknown error"}`,
            );
          }
        } finally {
          setIsCreatingInPlane(false);
        }
        resetWorkspace();
        return;
      }

      resetWorkspace();
      toast.success("Project saved — AI screening in progress");
      await navigate({
        to: "/project-trackers/$trackerId",
        params: { trackerId: created.trackerId },
      });
    } catch (err) {
      console.error(err);
      setIsCreatingInPlane(false);
      toast.error(
        err instanceof Error ? err.message : "Failed to save project",
      );
    }
  }, [
    createKickoff,
    createPlaneProject,
    draft,
    navigate,
    publicEmbed,
    rawText,
    resetWorkspace,
  ]);

  const continueToConfirmation = () => {
    if (!draft) return;
    if (!isDraftReady(draft)) {
      setStep2ContinueAttempted(true);
      toast.error("Fill in the required fields before continuing.");
      return;
    }
    setStep2ContinueAttempted(false);
    setStep(3);
  };

  return (
    <div className="block-space-mini container max-w-5xl">
      <header className="mb-8 space-y-2">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
          Project kickoff
          {publicEmbed && planeCtx?.workspaceSlug
            ? ` · Plane / ${planeCtx.workspaceSlug}`
            : null}
        </p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Turn notes into a structured project
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {publicEmbed
            ? "Paste kickoff notes or a document excerpt. We extract the fields, you review them, then save — creating the project in Plane and running AI screening."
            : "Paste kickoff notes or a document excerpt. We extract the fields, you review them, then save and run AI screening against firm criteria."}
        </p>
      </header>

      <WorkflowStepper
        current={step}
        hasDraft={!!draft}
        onStepChange={setStep}
      />

      <div className="mt-6 space-y-6">
        {(step === 1 || step === 2) && (
          <WorkspacePanel
            title={
              step === 1 ? "Paste source material" : "Review extracted fields"
            }
            description={
              step === 1
                ? "Meeting notes, kickoff doc, or email thread — then run extract."
                : "Adjust values before saving. Required fields are marked."
            }
            contentClassName={cn(
              "flex min-h-0 flex-col gap-5",
              step === 2 &&
                "max-h-[min(72dvh,680px)] overflow-y-auto overscroll-contain",
            )}
          >
            {step === 1 ? (
              <>
                <Textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Paste project kickoff text…"
                  className="min-h-[160px] resize-y text-sm leading-relaxed"
                  disabled={isLoading}
                  aria-label="Raw project text"
                />

                {!rawText.trim() && !isLoading ? (
                  <div className="border-border/60 text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center text-sm">
                    <ClipboardPaste
                      className="size-8 opacity-30"
                      aria-hidden
                      strokeWidth={1.25}
                    />
                    <p className="max-w-xs leading-relaxed">
                      Add source text, then run{" "}
                      <span className="text-foreground font-medium">
                        Extract
                      </span>{" "}
                      to populate the review form.
                    </p>
                  </div>
                ) : null}

                {isLoading ? (
                  <div
                    className="text-muted-foreground flex items-center gap-2 text-sm"
                    aria-live="polite"
                  >
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Extracting project fields…
                    {object?.projectName ? (
                      <span className="text-foreground font-medium">
                        {String(object.projectName)}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {error ? (
                  <p className="text-destructive text-sm" role="alert">
                    {error.message}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
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
                        Extract fields
                      </>
                    )}
                  </Button>
                  {isLoading ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => stop()}
                    >
                      Stop
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={resetWorkspace}
                  >
                    Clear
                  </Button>
                </div>
              </>
            ) : null}

            {step === 2 && draft ? (
              <>
                <ReviewDraftFields
                  draft={draft}
                  setDraft={setDraft}
                  highlightInvalid={highlightInvalidFields}
                />

                <div className="border-border/60 space-y-4 border-t pt-4">
                  {!draftReady ? (
                    <Alert
                      id="step2-validation-messages"
                      variant="destructive"
                      className={cn(
                        highlightInvalidFields && "ring-destructive/80 ring-2",
                      )}
                    >
                      <AlertTitle className="text-sm">
                        Complete required fields
                      </AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs sm:text-sm">
                          {collectStep2ValidationMessages(draft).map(
                            (message) => (
                              <li key={message}>{message}</li>
                            ),
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="gap-2"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={continueToConfirmation}
                      className="gap-2"
                      aria-describedby={
                        !draftReady && step2ContinueAttempted
                          ? "step2-validation-messages"
                          : undefined
                      }
                    >
                      Continue to confirmation
                      <ChevronRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </WorkspacePanel>
        )}

        {step === 3 && draft ? (
          <WorkspacePanel
            title="Final confirmation"
            description={
              publicEmbed
                ? "Review everything below before saving to trackers and creating the project in Plane."
                : "Review everything below before saving the project kickoff."
            }
            contentClassName="flex max-h-[min(75dvh,640px)] flex-col gap-5 overflow-y-auto overscroll-contain"
          >
            <ConfirmationSummary draft={draft} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ChevronLeft className="size-4" aria-hidden />
                Back to review
              </Button>
              <Button
                type="button"
                disabled={isSaving || !draftReady}
                onClick={() => void onConfirm()}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {publicEmbed
                  ? isCreatingInPlane
                    ? "Creating in Plane…"
                    : "Save & create in Plane"
                  : "Save project kickoff"}
              </Button>
            </div>
          </WorkspacePanel>
        ) : null}
      </div>
    </div>
  );
}
