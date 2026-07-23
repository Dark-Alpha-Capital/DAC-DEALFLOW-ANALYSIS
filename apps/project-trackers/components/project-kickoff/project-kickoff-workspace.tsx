import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  Check,
  ChevronLeft,
  ChevronRight,
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
import { useProjectKickoffScreeningPoll } from "@/hooks/use-project-kickoff-screening-poll";
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
  const {
    ctx: planeCtx,
    createProject: createPlaneProject,
    upsertAiEvaluation,
  } = usePlaneEmbed(initialWorkspaceSlug);
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [step, setStep] = useState<WorkflowStep>(1);
  const [step2ContinueAttempted, setStep2ContinueAttempted] = useState(false);
  const [isCreatingInPlane, setIsCreatingInPlane] = useState(false);
  const [rawTextareaKey, setRawTextareaKey] = useState(0);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [screeningJobId, setScreeningJobId] = useState<string | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [planeProjectId, setPlaneProjectId] = useState<string | null>(null);
  const [planeCreateError, setPlaneCreateError] = useState<string | null>(null);
  const [syncPhase, setSyncPhase] = useState<
    "idle" | "polling" | "pushing" | "done" | "failed"
  >("idle");
  const pushedRef = useRef(false);

  /** Plane iframes can desync controlled paste — always prefer live DOM value. */
  const readRawText = useCallback(() => {
    const fromDom = rawTextareaRef.current?.value;
    if (typeof fromDom === "string") return fromDom;
    return rawText;
  }, [rawText]);

  const { mutateAsync: createKickoff, isPending: isSavingKickoff } = useMutation(
    trpc.projectKickoffs.create.mutationOptions(),
  );
  const { mutateAsync: persistPlaneProjectId } = useMutation(
    trpc.projectKickoffs.setPlaneProjectId.mutationOptions(),
  );
  const isSaving = isSavingKickoff || isCreatingInPlane;

  const {
    progress,
    result: screeningResult,
    terminalState,
    isPolling,
  } = useProjectKickoffScreeningPoll(
    screeningJobId,
    publicEmbed && step === 4 && syncPhase === "polling",
  );

  const { submit, isLoading, error, clear, stop } = useObject({
    api: "/api/project-kickoff/extract",
    schema: projectKickoffExtractionSchema,
    // Public extract; omit cookies so sandboxed Plane iframes (Origin: null) work with CORS.
    credentials: "omit",
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
    if (!draft && step !== 1 && step !== 4) setStep(1);
  }, [draft, step]);

  useEffect(() => {
    if (step !== 2) setStep2ContinueAttempted(false);
  }, [step]);

  const draftReady = draft != null && isDraftReady(draft);
  const highlightInvalidFields =
    step === 2 &&
    step2ContinueAttempted &&
    draft != null &&
    !isDraftReady(draft);

  const resetWorkspace = useCallback(() => {
    clear();
    setDraft(null);
    setRawText("");
    setRawTextareaKey((key) => key + 1);
    setStep(1);
    setStep2ContinueAttempted(false);
    setScreeningJobId(null);
    setScreeningId(null);
    setPlaneProjectId(null);
    setPlaneCreateError(null);
    setSyncPhase("idle");
    pushedRef.current = false;
  }, [clear]);

  const onExtract = useCallback(() => {
    if (isLoading) return;
    const text = readRawText();
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Paste or type source text first");
      return;
    }
    if (text !== rawText) setRawText(text);
    submit({ rawText: text });
  }, [isLoading, rawText, readRawText, submit]);

  const onConfirm = useCallback(async () => {
    if (!draft || !isDraftReady(draft)) return;
    try {
      const kickoffDraft = toKickoffDraft(draft);
      const sourceText = readRawText();
      const created = await createKickoff({
        draft: kickoffDraft,
        rawText: sourceText,
      });

      if (publicEmbed) {
        setIsCreatingInPlane(true);
        let createdPlaneId: string | null = null;
        let createError: string | null = null;
        try {
          const structured = draftToStructured(kickoffDraft);
          const planeResult = await createPlaneProject(structured, {
            identifier: buildPlaneProjectIdentifier(structured.projectName),
            externalId: created.projectId,
          });

          const projectId = planeResult.project?.id ?? null;

          if (planeResult.success && projectId) {
            createdPlaneId = projectId;
            toast.success(
              planeResult.project?.name
                ? `Saved and created in Plane: ${planeResult.project.name}`
                : "Saved and created in Plane",
            );
            void persistPlaneProjectId({
              kickoffId: created.projectId,
              planeProjectId: projectId,
            }).catch(console.error);
          } else {
            createError = planeResult.error ?? "Plane create failed";
            toast.warning(`Kickoff saved, but Plane create failed: ${createError}`);
          }
        } finally {
          setIsCreatingInPlane(false);
        }

        setScreeningJobId(created.jobId);
        setScreeningId(created.screeningId);
        setPlaneProjectId(createdPlaneId);
        setPlaneCreateError(createError);
        pushedRef.current = false;
        setSyncPhase(createdPlaneId ? "polling" : "failed");
        setStep(4);
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
    persistPlaneProjectId,
    publicEmbed,
    readRawText,
    resetWorkspace,
  ]);

  useEffect(() => {
    if (!publicEmbed || step !== 4 || syncPhase !== "polling") return;
    if (!terminalState || pushedRef.current) return;

    const run = async () => {
      pushedRef.current = true;

      if (!planeProjectId) {
        setSyncPhase("failed");
        toast.warning(
          "Screening finished, but no Plane project id — evaluation was not synced",
        );
        return;
      }

      if (terminalState === "failed") {
        setSyncPhase("pushing");
        const upsertResult = await upsertAiEvaluation({
          projectId: planeProjectId,
          score: 0,
          analysis: "AI screening failed",
          status: "failed",
          externalId: screeningId ?? undefined,
          screenedAt: new Date().toISOString(),
        });
        if (upsertResult.success) {
          setSyncPhase("done");
          toast.warning("Screening failed — status synced to Plane");
        } else {
          setSyncPhase("failed");
          toast.error(
            upsertResult.error ?? "Failed to sync screening failure to Plane",
          );
        }
        return;
      }

      setSyncPhase("pushing");
      const upsertResult = await upsertAiEvaluation({
        projectId: planeProjectId,
        score: screeningResult?.score ?? 0,
        analysis: screeningResult?.analysis ?? "",
        status: "completed",
        externalId: screeningId ?? undefined,
        screenedAt: new Date().toISOString(),
      });

      if (upsertResult.success) {
        setSyncPhase("done");
        toast.success("AI evaluation synced to Plane");
      } else {
        setSyncPhase("failed");
        toast.error(
          upsertResult.error ?? "Failed to sync AI evaluation to Plane",
        );
      }
    };

    void run();
  }, [
    planeProjectId,
    publicEmbed,
    screeningId,
    screeningResult,
    step,
    syncPhase,
    terminalState,
    upsertAiEvaluation,
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
            ? "Paste kickoff notes or a document excerpt. We extract the fields, you review them, then save — creating the project in Plane and syncing AI screening."
            : "Paste kickoff notes or a document excerpt. We extract the fields, you review them, then save and run AI screening against firm criteria."}
        </p>
      </header>

      <WorkflowStepper
        current={step}
        hasDraft={!!draft}
        onStepChange={setStep}
        showScreeningStep={publicEmbed}
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
                  key={rawTextareaKey}
                  ref={rawTextareaRef}
                  defaultValue={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste kickoff notes here…"
                  className="min-h-[220px] resize-y font-mono text-sm"
                />

                {error ? (
                  <p className="text-destructive text-sm" role="alert">
                    {error.message}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={isLoading}
                    onClick={onExtract}
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

        {step === 4 && publicEmbed ? (
          <WorkspacePanel
            title="AI screening"
            description="Keep this sheet open until screening finishes and the score is pushed to Plane."
            contentClassName="flex flex-col gap-5"
          >
            {(syncPhase === "polling" || isPolling) && (
              <div className="flex items-start gap-3">
                <Loader2 className="text-muted-foreground mt-0.5 size-5 shrink-0 animate-spin" />
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    Screening in progress…
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {progress
                      ? `${progress.step} (${progress.percentage}%)`
                      : "Waiting for AI screening workflow"}
                  </p>
                </div>
              </div>
            )}

            {syncPhase === "pushing" ? (
              <div className="flex items-start gap-3">
                <Loader2 className="text-muted-foreground mt-0.5 size-5 shrink-0 animate-spin" />
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    Syncing evaluation to Plane…
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Writing score and analysis to the project overview.
                  </p>
                </div>
              </div>
            ) : null}

            {syncPhase === "done" && screeningResult ? (
              <div className="space-y-3">
                <Alert>
                  <AlertTitle className="text-sm">
                    Score {screeningResult.score.toFixed(1)} / 5
                  </AlertTitle>
                  <AlertDescription className="text-sm whitespace-pre-wrap">
                    {screeningResult.analysis}
                  </AlertDescription>
                </Alert>
                <p className="text-muted-foreground text-xs">
                  Evaluation saved on the Plane project overview.
                </p>
              </div>
            ) : null}

            {syncPhase === "done" && !screeningResult ? (
              <Alert>
                <AlertTitle className="text-sm">Synced to Plane</AlertTitle>
                <AlertDescription className="text-sm">
                  Screening status was written to the project overview.
                </AlertDescription>
              </Alert>
            ) : null}

            {syncPhase === "failed" ? (
              <Alert variant="destructive">
                <AlertTitle className="text-sm">
                  {planeProjectId ? "Could not sync AI score" : "Plane project was not created"}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {planeCreateError ??
                    "Kickoff was saved in project-trackers. You can close this sheet or try again."}
                </AlertDescription>
              </Alert>
            ) : null}

            {(syncPhase === "done" || syncPhase === "failed") && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={resetWorkspace} className="gap-2">
                  <Check className="size-4" />
                  Done
                </Button>
              </div>
            )}
          </WorkspacePanel>
        ) : null}
      </div>
    </div>
  );
}
