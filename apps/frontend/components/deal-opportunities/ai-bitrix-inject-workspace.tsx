import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useMutation } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useRouter } from "@/lib/navigation-shim";
import type { AppRouter } from "@/trpc/routers/_app";
import { bitrixDealOpportunityExtractionSchema } from "@repo/bitrix-sync";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, formatNumberWithCommas, unformatNumber } from "@/lib/utils";
import { i } from "shiki/dist/langs-bundle-full-C-zczmvu.mjs";

/** Empty input for editing; formatted commas for display. */
function commaInputValue(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return formatNumberWithCommas(String(n));
}

const BITRIX_SYNC_CURRENCY = "USD" as const;

type ReviewDraft = {
  title: string;
  stageId: string;
  revenue: number | null;
  teaser: string;
  sourceWebsite: string;
  companyLocation: string;
  industry: string;
  brokerFirstName: string;
  brokerLastName: string;
  brokerEmail: string;
  brokerPhone: string;
  brokerLinkedIn: string;
  askingPrice: number | null;
  ebitda: number | null;
  ebitdaMargin: number | null;
};

function extractionToDraft(
  o: Record<string, unknown>,
  suggestedStageId: string,
): ReviewDraft | null {
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const teaserRaw = typeof o.teaser === "string" ? o.teaser : "";

  const str = (v: unknown) =>
    typeof v === "string" ? v : v == null ? "" : String(v);
  const numOrNull = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };

  if (!title) return null;

  return {
    title,
    stageId: suggestedStageId,
    revenue: numOrNull(o.revenue),
    teaser: teaserRaw,
    sourceWebsite: "",
    companyLocation: str(o.companyLocation),
    industry: str(o.industry),
    brokerFirstName: str(o.brokerFirstName),
    brokerLastName: str(o.brokerLastName),
    brokerEmail: str(o.brokerEmail),
    brokerPhone: str(o.brokerPhone),
    brokerLinkedIn: str(o.brokerLinkedIn),
    askingPrice: numOrNull(o.askingPrice),
    ebitda: numOrNull(o.ebitda),
    ebitdaMargin: numOrNull(o.ebitdaMargin),
  };
}

/** Human-readable messages for each required field still missing on step 2. */
function collectStep2ValidationMessages(d: ReviewDraft): string[] {
  const msgs: string[] = [];
  if (!d.title.trim()) {
    msgs.push("Please enter a deal title.");
  }
  if (d.revenue == null || !Number.isFinite(d.revenue)) {
    msgs.push("Please enter revenue (TTM / company).");
  }
  if (d.askingPrice == null || !Number.isFinite(d.askingPrice)) {
    msgs.push("Please enter asking price.");
  }
  if (!d.sourceWebsite.trim()) {
    msgs.push("Please enter source website.");
  }
  if (!d.companyLocation.trim()) {
    msgs.push("Please enter company location.");
  }
  if (!d.stageId.trim()) {
    msgs.push("Please select or enter a Bitrix stage.");
  }
  return msgs;
}

function isAiInjectDraftReady(d: ReviewDraft): boolean {
  return collectStep2ValidationMessages(d).length === 0;
}

/** After a failed “Continue” on step 2, ring invalid required fields. */
function step2InvalidFieldRing(
  highlight: boolean,
  fieldInvalid: boolean,
): string | undefined {
  return highlight && fieldInvalid
    ? "ring-2 ring-destructive border-destructive"
    : undefined;
}

function dollarReadOnly(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${formatNumberWithCommas(String(n))}`;
}

function DollarInput(props: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2 text-sm select-none"
        aria-hidden
      >
        $
      </span>
      <Input
        {...props}
        className={cn("pl-7 font-mono tabular-nums", props.className)}
      />
    </div>
  );
}

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

type WorkflowStep = 1 | 2 | 3;

const WORKFLOW_STEPS: {
  step: WorkflowStep;
  label: string;
  description: string;
  icon: typeof ClipboardPaste;
}[] = [
  {
    step: 1,
    label: "Paste source",
    description: "Raw deal text",
    icon: ClipboardPaste,
  },
  {
    step: 2,
    label: "Review fields",
    description: "Edit before sync",
    icon: PenLine,
  },
  {
    step: 3,
    label: "Final confirmation",
    description: "Confirm & push to Bitrix24",
    icon: ShieldCheck,
  },
];

function stageNameForId(
  stages: { statusId: string; name: string }[],
  stageId: string,
): string {
  return stages.find((s) => s.statusId === stageId)?.name ?? stageId;
}

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
              (wizardStep === 3 && current === 3);
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

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border/60 grid gap-1 border-b py-2 last:border-b-0 sm:grid-cols-[minmax(0,140px)_1fr] sm:gap-3 sm:py-2 md:grid-cols-[minmax(0,180px)_1fr]">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase sm:pt-0.5">
        {label}
      </div>
      <div className="text-foreground min-w-0 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export type BitrixAiInjectContext =
  inferRouterOutputs<AppRouter>["dealOpportunities"]["getBitrixAiInjectContext"];

export function AiBitrixInjectWorkspace({
  bitrixAiInjectContext: bx,
  assignedByUserId,
}: {
  bitrixAiInjectContext: BitrixAiInjectContext;
  assignedByUserId?: number;
}) {
  const trpc = useTRPC();
  const router = useRouter();

  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [step, setStep] = useState<WorkflowStep>(1);
  const [step2ContinueAttempted, setStep2ContinueAttempted] = useState(false);

  const suggestedStage = bx.suggestedStageId ?? "";

  useEffect(() => {
    if (!draft && step !== 1) setStep(1);
  }, [draft, step]);

  useEffect(() => {
    if (step !== 2) setStep2ContinueAttempted(false);
  }, [step]);

  const { object, submit, isLoading, error, clear, stop } = useObject({
    api: "/api/deal-opportunities/ai-bitrix-extract",
    schema: bitrixDealOpportunityExtractionSchema,
    credentials: "include",
    onFinish: ({ object: finished, error: finishErr }) => {
      if (finishErr) {
        toast.error(finishErr.message || "Extraction did not match schema");
        return;
      }
      if (!finished) {
        toast.error("No structured deal returned");
        return;
      }
      const next = extractionToDraft(
        finished as Record<string, unknown>,
        suggestedStage,
      );
      if (!next) {
        toast.error("Title is required in the extraction result");
        return;
      }
      setDraft(next);
      setStep(2);
      toast.success("Extraction complete — review fields below");
    },
  });

  const stages = bx.stages ?? [];
  const needsManualStageId = stages.length === 0;
  const fm = bx.aiBitrixFieldMeta;
  const dealFieldsCatalogEmpty =
    (bx.dealFieldsCatalogCount ?? 0) === 0 && Boolean(bx.webhookConfigured);

  const createMutation = useMutation(
    trpc.dealOpportunities.createOpportunity.mutationOptions({
      onError: (e) => toast.error(e.message || "Could not create opportunity"),
    }),
  );

  const syncMutation = useMutation(
    trpc.dealOpportunities.syncDealOpportunityToBitrix.mutationOptions({
      onError: (e) => toast.error(e.message || "Bitrix sync failed"),
    }),
  );

  const busy = createMutation.isPending || syncMutation.isPending;

  const canExtract = rawText.trim().length > 0 && !isLoading;

  const onConfirm = useCallback(async () => {
    if (!draft) return;
    const d = draft;
    if (!isAiInjectDraftReady(d)) {
      toast.error("Fill all required fields before syncing to Bitrix24.");
      return;
    }
    const title = d.title.trim();
    const stageId = d.stageId.trim();
    const narrative = d.teaser.trim() || title;

    const created = await createMutation.mutateAsync({
      dealTeaser: narrative,
      description: undefined,
      sourceWebsite: d.sourceWebsite.trim(),
      brokerFirstName: d.brokerFirstName.trim() || undefined,
      brokerLastName: d.brokerLastName.trim() || undefined,
      brokerEmail: d.brokerEmail.trim() || undefined,
      brokerPhone: d.brokerPhone.trim() || undefined,
      brokerLinkedIn: d.brokerLinkedIn.trim() || undefined,
      revenue: d.revenue ?? undefined,
      ebitda: d.ebitda ?? undefined,
      ebitdaMargin: d.ebitdaMargin ?? undefined,
      askingPrice: d.askingPrice ?? undefined,
    });

    const dealOpportunityId = created.dealOpportunityId;
    if (!dealOpportunityId) {
      toast.error("Create did not return an id");
      return;
    }

    const synced = await syncMutation.mutateAsync({
      dealOpportunityId,
      title,
      stageId,
      currencyId: BITRIX_SYNC_CURRENCY,
      sourceWebsite: d.sourceWebsite.trim(),
      companyLocation: d.companyLocation.trim() || null,
      industry: d.industry.trim() || null,
      brokerFirstName: d.brokerFirstName.trim() || null,
      brokerLastName: d.brokerLastName.trim() || null,
      brokerEmail: d.brokerEmail.trim() || null,
      brokerPhone: d.brokerPhone.trim() || null,
      brokerLinkedIn: d.brokerLinkedIn.trim() || null,
      askingPrice: d.askingPrice,
      ebitda: d.ebitda,
      ebitdaMargin: d.ebitdaMargin,
      revenue: d.revenue,
      teaser: narrative,
      description: null,
      assignedByUserId,
    });

    toast.success("Deal created and synced to Bitrix24");
    void router.invalidate();
    if (synced.bitrixLink) {
      window.open(synced.bitrixLink, "_blank", "noopener,noreferrer");
    }
  }, [createMutation, draft, router, syncMutation]);

  const displayObject = draft ?? object;

  const showFieldGrid = step === 2 && !!draft;

  const confirmTitle = draft?.title.trim() || "—";
  const confirmStageId = draft?.stageId.trim() || "—";
  const confirmNarrative = draft?.teaser.trim() || "—";
  const confirmStageLabel =
    draft != null && draft.stageId.trim() !== ""
      ? stageNameForId(stages, draft.stageId.trim())
      : "—";

  const draftReadyForSync = draft != null && isAiInjectDraftReady(draft);

  const step2HighlightInvalidFields =
    step === 2 &&
    step2ContinueAttempted &&
    draft != null &&
    !isAiInjectDraftReady(draft);

  return (
    <div className="mx-auto w-full max-w-5xl px-2 pb-10 sm:px-4 sm:pb-12">
      <header className="mb-3 space-y-1 sm:mb-4">
        <h1 className="text-foreground flex items-center gap-2 text-lg font-semibold tracking-tight sm:gap-2.5 sm:text-xl md:text-2xl">
          <Sparkles
            className="text-primary size-5 shrink-0 sm:size-6 md:size-7"
            aria-hidden
          />
          AI → Bitrix24
        </h1>
        <p className="text-muted-foreground max-w-lg text-xs leading-snug sm:text-sm sm:leading-relaxed">
          Paste source text, refine extracted fields, then confirm everything
          before creating the deal in Bitrix24.
        </p>
      </header>

      <WorkflowStepper
        current={step}
        hasDraft={!!draft}
        onStepChange={setStep}
      />

      <div className="space-y-2">
        {!bx.webhookConfigured && (
          <Alert variant="destructive" className="py-2">
            <AlertTitle className="text-sm">Not configured</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              Set <code className="text-xs">BITRIX24_WEBHOOK</code> on the
              server before syncing.
            </AlertDescription>
          </Alert>
        )}

        {needsManualStageId && bx.webhookConfigured && (
          <Alert className="border-border/80 py-2">
            <AlertTitle className="text-sm">No stage list</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              Run <code className="text-xs">bun run fetch-stages</code> in{" "}
              <code className="text-xs">packages/bitrix-sync</code> or set{" "}
              <code className="text-xs">BITRIX_DEAL_STAGES_JSON</code>. You can
              paste a raw <code className="text-xs">STAGE_ID</code> when
              editing.
            </AlertDescription>
          </Alert>
        )}

        {dealFieldsCatalogEmpty && (
          <Alert className="border-border/80 py-2">
            <AlertTitle className="text-sm">Field catalog</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              No Bitrix field snapshot yet. Run{" "}
              <code className="text-xs">bun run fetch-deal-fields</code> in{" "}
              <code className="text-xs">packages/bitrix-sync</code> or set{" "}
              <code className="text-xs">BITRIX_DEAL_FIELDS_JSON</code>. Field
              codes still show under each label.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        {(step === 1 || step === 2) && (
          <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col overflow-hidden rounded-xl ring-1">
            <div className="border-border/50 space-y-0.5 border-b px-3 py-2 sm:px-4">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                {step === 1 ? "Paste raw deal text" : "Review & edit fields"}
              </h2>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs sm:leading-relaxed">
                {step === 1
                  ? "Teaser, email thread, or notes — then run Extract."
                  : "Adjust values and Bitrix stage before you confirm the sync."}
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
              {step === 1 ? (
                <>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Paste deal text…"
                    className="min-h-[100px] w-full shrink-0 resize-y text-sm leading-snug sm:min-h-[120px] sm:leading-relaxed md:min-h-[140px] md:text-[15px]"
                    disabled={isLoading}
                    aria-label="Raw deal text"
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
                  Extracting deal fields…
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

              {showFieldGrid && (
                <div className="grid w-full gap-2.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2.5">
                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel required>
                      {fm?.title.label ?? "Title"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.title}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, title: e.target.value } : d,
                          )
                        }
                        className={cn(
                          step2InvalidFieldRing(
                            step2HighlightInvalidFields,
                            !draft.title.trim(),
                          ),
                        )}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {(displayObject as { title?: string })?.title || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel required>
                      {fm?.revenue.label ?? "Revenue (TTM / company)"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <DollarInput
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={commaInputValue(draft.revenue)}
                        onChange={(e) => {
                          const f = formatNumberWithCommas(e.target.value);
                          const p = unformatNumber(f).trim();
                          setDraft((d) => {
                            if (!d) return d;
                            if (p === "") return { ...d, revenue: null };
                            const n = Number(p);
                            return Number.isFinite(n)
                              ? { ...d, revenue: n }
                              : d;
                          });
                        }}
                        className={cn(
                          step2InvalidFieldRing(
                            step2HighlightInvalidFields,
                            draft.revenue == null ||
                              !Number.isFinite(draft.revenue),
                          ),
                        )}
                      />
                    ) : (
                      <p className="text-foreground text-sm tabular-nums">
                        {dollarReadOnly(
                          (displayObject as { revenue?: number | null })
                            ?.revenue,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel required>
                      {fm?.askingPrice.label ?? "Asking price"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <DollarInput
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={commaInputValue(draft.askingPrice)}
                        onChange={(e) => {
                          const f = formatNumberWithCommas(e.target.value);
                          const p = unformatNumber(f).trim();
                          setDraft((d) => {
                            if (!d) return d;
                            if (p === "") return { ...d, askingPrice: null };
                            const n = Number(p);
                            return Number.isFinite(n)
                              ? { ...d, askingPrice: n }
                              : d;
                          });
                        }}
                        className={cn(
                          step2InvalidFieldRing(
                            step2HighlightInvalidFields,
                            draft.askingPrice == null ||
                              !Number.isFinite(draft.askingPrice),
                          ),
                        )}
                      />
                    ) : (
                      <p className="text-foreground text-sm tabular-nums">
                        {dollarReadOnly(
                          (displayObject as { askingPrice?: number | null })
                            ?.askingPrice,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>{fm?.ebitda.label ?? "EBITDA"}</FieldLabel>
                    {step === 2 && draft ? (
                      <DollarInput
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={commaInputValue(draft.ebitda)}
                        onChange={(e) => {
                          const f = formatNumberWithCommas(e.target.value);
                          const p = unformatNumber(f).trim();
                          setDraft((d) => {
                            if (!d) return d;
                            if (p === "") return { ...d, ebitda: null };
                            const n = Number(p);
                            return Number.isFinite(n) ? { ...d, ebitda: n } : d;
                          });
                        }}
                      />
                    ) : (
                      <p className="text-foreground text-sm tabular-nums">
                        {dollarReadOnly(
                          (displayObject as { ebitda?: number | null })?.ebitda,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>
                      {fm?.ebitdaMargin.label ?? "EBITDA margin"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <DollarInput
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={commaInputValue(draft.ebitdaMargin)}
                        onChange={(e) => {
                          const f = formatNumberWithCommas(e.target.value);
                          const p = unformatNumber(f).trim();
                          setDraft((d) => {
                            if (!d) return d;
                            if (p === "") return { ...d, ebitdaMargin: null };
                            const n = Number(p);
                            return Number.isFinite(n)
                              ? { ...d, ebitdaMargin: n }
                              : d;
                          });
                        }}
                      />
                    ) : (
                      <p className="text-foreground text-sm tabular-nums">
                        {dollarReadOnly(
                          (displayObject as { ebitdaMargin?: number | null })
                            ?.ebitdaMargin,
                        )}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>
                      {fm?.teaser.label ?? "Deal narrative"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Textarea
                        rows={8}
                        value={draft.teaser}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, teaser: e.target.value } : d,
                          )
                        }
                        className="min-h-[100px] text-sm leading-snug sm:min-h-[140px] sm:leading-relaxed md:min-h-[160px]"
                      />
                    ) : (
                      <p className="text-foreground max-h-[min(28vh,200px)] overflow-y-auto text-sm whitespace-pre-wrap sm:max-h-[min(36vh,280px)]">
                        {(displayObject as { teaser?: string })?.teaser || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel required>
                      {fm?.sourceWebsite.label ?? "Source website"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.sourceWebsite}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, sourceWebsite: e.target.value } : d,
                          )
                        }
                        placeholder="Paste listing URL (not extracted)"
                        inputMode="url"
                        autoComplete="off"
                        required
                        className={cn(
                          step2InvalidFieldRing(
                            step2HighlightInvalidFields,
                            !draft.sourceWebsite.trim(),
                          ),
                        )}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Enter manually on review — not extracted by AI.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel required>
                      {fm?.companyLocation.label ?? "Company location"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.companyLocation}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, companyLocation: e.target.value } : d,
                          )
                        }
                        className={cn(
                          step2InvalidFieldRing(
                            step2HighlightInvalidFields,
                            !draft.companyLocation.trim(),
                          ),
                        )}
                      />
                    ) : (
                      <p className="text-foreground text-sm">
                        {(displayObject as { companyLocation?: string | null })
                          ?.companyLocation || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>{fm?.industry.label ?? "Industry"}</FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.industry}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, industry: e.target.value } : d,
                          )
                        }
                      />
                    ) : (
                      <p className="text-foreground text-sm">
                        {(displayObject as { industry?: string | null })
                          ?.industry || "—"}
                      </p>
                    )}
                  </div>

                  <Separator className="my-1.5 sm:col-span-2" />

                  <div className="space-y-1">
                    <FieldLabel>
                      {fm?.brokerFirstName.label ?? "Broker first name"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.brokerFirstName}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, brokerFirstName: e.target.value } : d,
                          )
                        }
                      />
                    ) : (
                      <p className="text-foreground text-sm">
                        {(displayObject as { brokerFirstName?: string | null })
                          ?.brokerFirstName || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>
                      {fm?.brokerLastName.label ?? "Broker last name"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.brokerLastName}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, brokerLastName: e.target.value } : d,
                          )
                        }
                      />
                    ) : (
                      <p className="text-foreground text-sm">
                        {(displayObject as { brokerLastName?: string | null })
                          ?.brokerLastName || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <FieldLabel>
                      {fm?.brokerEmail.label ?? "Broker email"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.brokerEmail}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, brokerEmail: e.target.value } : d,
                          )
                        }
                      />
                    ) : (
                      <p className="text-foreground text-sm break-all">
                        {(displayObject as { brokerEmail?: string | null })
                          ?.brokerEmail || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>
                      {fm?.brokerPhone.label ?? "Broker phone"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.brokerPhone}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, brokerPhone: e.target.value } : d,
                          )
                        }
                      />
                    ) : (
                      <p className="text-foreground text-sm">
                        {(displayObject as { brokerPhone?: string | null })
                          ?.brokerPhone || "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel>
                      {fm?.brokerLinkedIn.label ?? "Broker LinkedIn"}
                    </FieldLabel>
                    {step === 2 && draft ? (
                      <Input
                        value={draft.brokerLinkedIn}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, brokerLinkedIn: e.target.value } : d,
                          )
                        }
                      />
                    ) : (
                      <p className="text-foreground text-sm break-all">
                        {(displayObject as { brokerLinkedIn?: string | null })
                          ?.brokerLinkedIn || "—"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && draft && !isLoading ? (
                <div className="border-border/50 mt-3 w-full min-w-0 space-y-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="bitrix-stage-ai"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      {fm?.stageId.label ?? "Bitrix stage"}
                      <span className="text-destructive ml-0.5" aria-hidden>
                        *
                      </span>
                    </Label>
                    {stages.length > 0 ? (
                      <Select
                        value={draft.stageId}
                        onValueChange={(v) =>
                          setDraft((d) => (d ? { ...d, stageId: v } : d))
                        }
                      >
                        <SelectTrigger
                          id="bitrix-stage-ai"
                          className={cn(
                            "h-9 w-full max-w-md text-sm",
                            step2InvalidFieldRing(
                              step2HighlightInvalidFields,
                              !draft.stageId.trim(),
                            ),
                          )}
                        >
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((s) => (
                            <SelectItem key={s.statusId} value={s.statusId}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="bitrix-stage-ai"
                        className={cn(
                          "h-9 w-full max-w-md font-mono text-sm",
                          step2InvalidFieldRing(
                            step2HighlightInvalidFields,
                            !draft.stageId.trim(),
                          ),
                        )}
                        placeholder="e.g. C7:NEW or DT31_…:UC_…"
                        value={draft.stageId}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, stageId: e.target.value } : d,
                          )
                        }
                      />
                    )}
                  </div>

                  {!draftReadyForSync ? (
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
                        if (!isAiInjectDraftReady(draft)) {
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
                        !draftReadyForSync && step2ContinueAttempted
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

        {step === 3 && draft ? (
          <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col overflow-hidden rounded-xl ring-1">
            <div className="border-border/50 space-y-0.5 border-b px-3 py-2 sm:px-4">
              <h2 className="text-foreground text-sm font-semibold tracking-tight">
                Final confirmation
              </h2>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs sm:leading-relaxed">
                Values below will be sent when you create the deal and sync to
                Bitrix24.
              </p>
            </div>
            <div className="flex max-h-[min(75dvh,640px)] flex-col gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
              <div className="border-border/50 rounded-lg border px-2 sm:px-3">
                <SummaryRow label={fm?.title.label ?? "Deal title"}>
                  {confirmTitle}
                </SummaryRow>
                <SummaryRow label={fm?.stageId.label ?? "Bitrix stage"}>
                  <span className="font-medium">{confirmStageLabel}</span>
                  <span className="text-muted-foreground mt-1 block font-mono text-xs">
                    {confirmStageId}
                  </span>
                </SummaryRow>
                <SummaryRow label="Currency">{BITRIX_SYNC_CURRENCY}</SummaryRow>
                <SummaryRow label={fm?.teaser.label ?? "Deal narrative"}>
                  <span className="whitespace-pre-wrap">
                    {confirmNarrative}
                  </span>
                </SummaryRow>
                <SummaryRow
                  label={fm?.revenue.label ?? "Revenue (TTM / company)"}
                >
                  {dollarReadOnly(draft.revenue)}
                </SummaryRow>
                <SummaryRow label={fm?.askingPrice.label ?? "Asking price"}>
                  {dollarReadOnly(draft.askingPrice)}
                </SummaryRow>
                <SummaryRow label={fm?.ebitda.label ?? "EBITDA"}>
                  {dollarReadOnly(draft.ebitda)}
                </SummaryRow>
                <SummaryRow label={fm?.ebitdaMargin.label ?? "EBITDA margin"}>
                  {dollarReadOnly(draft.ebitdaMargin)}
                </SummaryRow>
                <SummaryRow label={fm?.sourceWebsite.label ?? "Source website"}>
                  {draft.sourceWebsite.trim() || "—"}
                </SummaryRow>
                <SummaryRow
                  label={fm?.companyLocation.label ?? "Company location"}
                >
                  {draft.companyLocation.trim() || "—"}
                </SummaryRow>
                <SummaryRow label={fm?.industry.label ?? "Industry"}>
                  {draft.industry.trim() || "—"}
                </SummaryRow>
                <SummaryRow
                  label={fm?.brokerFirstName.label ?? "Broker first name"}
                >
                  {draft.brokerFirstName.trim() || "—"}
                </SummaryRow>
                <SummaryRow
                  label={fm?.brokerLastName.label ?? "Broker last name"}
                >
                  {draft.brokerLastName.trim() || "—"}
                </SummaryRow>
                <SummaryRow label={fm?.brokerEmail.label ?? "Broker email"}>
                  {draft.brokerEmail.trim() || "—"}
                </SummaryRow>
                <SummaryRow label={fm?.brokerPhone.label ?? "Broker phone"}>
                  {draft.brokerPhone.trim() || "—"}
                </SummaryRow>
                <SummaryRow
                  label={fm?.brokerLinkedIn.label ?? "Broker LinkedIn"}
                >
                  {draft.brokerLinkedIn.trim() || "—"}
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
                  disabled={busy || !draftReadyForSync}
                  onClick={() => void onConfirm()}
                  className="gap-2"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Push to Bitrix24
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
