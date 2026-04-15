import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { bitrixDealOpportunityExtractionSchema } from "@repo/bitrix-sync";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Check, Loader2, Sparkles } from "lucide-react";
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

const TOP_NAV_LINKS = [
  { to: "/" as const, label: "Home" },
  { to: "/deal-opportunities" as const, label: "Deals" },
  { to: "/screeners" as const, label: "Screeners" },
  { to: "/companies" as const, label: "Companies" },
] as const;

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
  const teaser = teaserRaw.trim();
  if (!title || !teaser) return null;

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

  return {
    title,
    stageId: suggestedStageId,
    revenue: numOrNull(o.revenue),
    teaser: teaserRaw,
    sourceWebsite: str(o.sourceWebsite),
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

export function AiBitrixInjectWorkspace() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: bx } = useQuery(
    trpc.dealOpportunities.getBitrixAiInjectContext.queryOptions(),
  );

  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ReviewDraft | null>(null);

  const suggestedStage = bx?.suggestedStageId ?? "";

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
        toast.error(
          "Title and deal narrative (teaser) are required in the result",
        );
        return;
      }
      setDraft(next);
      toast.success("Extraction complete — review below");
    },
  });

  const stages = bx?.stages ?? [];
  const needsManualStageId = stages.length === 0;
  const fm = bx?.aiBitrixFieldMeta;
  const dealFieldsCatalogEmpty =
    (bx?.dealFieldsCatalogCount ?? 0) === 0 && Boolean(bx?.webhookConfigured);

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
    const title = d.title.trim() || "Untitled deal";
    const stageId =
      d.stageId.trim() || suggestedStage || stages[0]?.statusId || "NEW";
    const narrative = d.teaser.trim() || title;

    const created = await createMutation.mutateAsync({
      dealTeaser: narrative,
      description: undefined,
      sourceWebsite: d.sourceWebsite.trim() || undefined,
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
      sourceWebsite: d.sourceWebsite.trim() || null,
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
    });

    toast.success("Deal created and synced to Bitrix24");
    void router.invalidate();
    if (synced.bitrixLink) {
      window.open(synced.bitrixLink, "_blank", "noopener,noreferrer");
    }
    router.push(`/deal-opportunities/${dealOpportunityId}`);
  }, [createMutation, draft, router, stages, suggestedStage, syncMutation]);

  const displayObject = draft ?? object;

  const resultTitle =
    isLoading || displayObject
      ? isLoading
        ? "Streaming"
        : "Review"
      : "Extraction";

  const resultHint =
    isLoading || displayObject
      ? isLoading
        ? "Fields fill in as the model responds."
        : "Adjust fields, set stage, then sync."
      : "Extract to map fields from the source panel.";

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-20 sm:px-5">
      <nav
        className="border-border/50 -mx-3 mb-8 border-b pb-4 sm:-mx-5"
        aria-label="App navigation"
      >
        <ul className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
          {TOP_NAV_LINKS.map(({ to, label }, i) => (
            <li key={to} className="flex items-center">
              {i > 0 ? (
                <span
                  className="text-border mx-1.5 hidden select-none sm:inline"
                  aria-hidden
                >
                  ·
                </span>
              ) : null}
              <Link
                to={to}
                className={cn(
                  "text-muted-foreground hover:text-foreground rounded-md px-1.5 py-1.5 text-sm transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <header className="mb-6 space-y-2">
        <h1 className="text-foreground flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl">
          <Sparkles
            className="text-primary size-6 shrink-0 sm:size-7"
            aria-hidden
          />
          AI → Bitrix24
        </h1>
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
          Paste deal text, review streamed fields, create the opportunity, and
          push to Bitrix in one flow.
        </p>
      </header>

      <div className="space-y-2.5">
        {!bx?.webhookConfigured && (
          <Alert variant="destructive" className="py-3">
            <AlertTitle className="text-sm">Not configured</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              Set <code className="text-xs">BITRIX24_WEBHOOK</code> on the
              server before syncing.
            </AlertDescription>
          </Alert>
        )}

        {needsManualStageId && bx?.webhookConfigured && (
          <Alert className="border-border/80 py-3">
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
          <Alert className="border-border/80 py-3">
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

      <div className="mt-6 grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-stretch">
        <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col rounded-xl ring-1">
          <div className="border-border/50 space-y-0.5 border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">Source</h2>
            <p className="text-muted-foreground text-xs">
              Teaser, email thread, or notes.
            </p>
          </div>
          <div className="flex min-h-[220px] flex-1 flex-col gap-3 p-4 sm:min-h-[260px] sm:p-5 lg:min-h-[min(72vh,760px)]">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste deal text…"
              className="min-h-[180px] flex-1 resize-y text-sm leading-relaxed sm:min-h-[200px] sm:text-[15px]"
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
          </div>
        </section>

        <section className="bg-card/40 ring-border/60 flex min-h-0 flex-col rounded-xl ring-1">
          <div className="border-border/50 space-y-0.5 border-b px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium">{resultTitle}</h2>
            <p className="text-muted-foreground text-xs">{resultHint}</p>
          </div>
          <div
            className={cn(
              "flex min-h-[220px] flex-1 flex-col p-4 sm:min-h-[260px] sm:p-5 lg:min-h-[min(72vh,760px)]",
              isLoading || displayObject
                ? "overflow-y-auto"
                : "items-center justify-center",
            )}
          >
            {!isLoading && !displayObject ? (
              <div className="text-muted-foreground flex max-w-[240px] flex-col items-center gap-3 text-center text-sm">
                <Sparkles
                  className="size-8 opacity-[0.35]"
                  aria-hidden
                  strokeWidth={1.25}
                />
                <p className="leading-snug">
                  Add source text, then run{" "}
                  <span className="font-medium">Extract</span>.
                </p>
              </div>
            ) : null}

            {isLoading && !displayObject ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Waiting for first tokens…
              </div>
            ) : null}

            {(isLoading || displayObject) && (
              <div className="grid w-full gap-4 sm:grid-cols-2 sm:gap-x-5">
                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>{fm?.title.label ?? "Title"}</FieldLabel>
                  {draft ? (
                    <Input
                      value={draft.title}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, title: e.target.value } : d,
                        )
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {(displayObject as { title?: string })?.title || "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.revenue.label ?? "Revenue (TTM / company)"}
                  </FieldLabel>
                  {draft ? (
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
                          return Number.isFinite(n) ? { ...d, revenue: n } : d;
                        });
                      }}
                    />
                  ) : (
                    <p className="text-foreground text-sm tabular-nums">
                      {dollarReadOnly(
                        (displayObject as { revenue?: number | null })?.revenue,
                      )}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.askingPrice.label ?? "Asking price"}
                  </FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5">
                  <FieldLabel>{fm?.ebitda.label ?? "EBITDA"}</FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.ebitdaMargin.label ?? "EBITDA margin"}
                  </FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel required>
                    {fm?.teaser.label ?? "Deal narrative"}
                  </FieldLabel>
                  {draft ? (
                    <Textarea
                      rows={12}
                      value={draft.teaser}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, teaser: e.target.value } : d,
                        )
                      }
                      className="min-h-[200px] text-sm leading-relaxed"
                    />
                  ) : (
                    <p className="text-foreground max-h-[min(40vh,320px)] overflow-y-auto text-sm whitespace-pre-wrap">
                      {(displayObject as { teaser?: string })?.teaser || "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.sourceWebsite.label ?? "Source website"}
                  </FieldLabel>
                  {draft ? (
                    <Input
                      value={draft.sourceWebsite}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, sourceWebsite: e.target.value } : d,
                        )
                      }
                      placeholder="https://…"
                      inputMode="url"
                      autoComplete="url"
                    />
                  ) : (
                    <p className="text-foreground text-sm break-all">
                      {(displayObject as { sourceWebsite?: string | null })
                        ?.sourceWebsite || "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.companyLocation.label ?? "Company location"}
                  </FieldLabel>
                  {draft ? (
                    <Input
                      value={draft.companyLocation}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, companyLocation: e.target.value } : d,
                        )
                      }
                    />
                  ) : (
                    <p className="text-foreground text-sm">
                      {(displayObject as { companyLocation?: string | null })
                        ?.companyLocation || "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>{fm?.industry.label ?? "Industry"}</FieldLabel>
                  {draft ? (
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

                <Separator className="my-2 sm:col-span-2" />

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.brokerFirstName.label ?? "Broker first name"}
                  </FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.brokerLastName.label ?? "Broker last name"}
                  </FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel>
                    {fm?.brokerEmail.label ?? "Broker email"}
                  </FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.brokerPhone.label ?? "Broker phone"}
                  </FieldLabel>
                  {draft ? (
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

                <div className="space-y-1.5">
                  <FieldLabel>
                    {fm?.brokerLinkedIn.label ?? "Broker LinkedIn"}
                  </FieldLabel>
                  {draft ? (
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

            {draft && !isLoading ? (
              <div className="border-border/50 mt-5 w-full min-w-0 space-y-4 border-t pt-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="bitrix-stage-ai"
                    className="text-muted-foreground text-xs font-medium"
                  >
                    {fm?.stageId.label ?? "Bitrix stage"}
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
                        className="h-9 w-full max-w-md text-sm"
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
                      className="h-9 w-full max-w-md font-mono text-sm"
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

                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !draft}
                  onClick={() => void onConfirm()}
                  className="gap-2"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Create & sync to Bitrix
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
