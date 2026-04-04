import * as React from "react";
import type { Control, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "@/lib/navigation-shim";
import {
  QuickAddDealFormSchema,
  QuickAddDealFormValues,
} from "@/lib/zod-schemas/quick-add-deal-form";
import {
  COVERAGE_STATUSES,
  GROWTH_LEVER_OPTIONS,
} from "@/lib/zod-schemas/shared-form-enums";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldSeparator,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumberWithCommas, unformatNumber } from "@/lib/utils";
import { X } from "lucide-react";

function parseNumericField(value?: string | null) {
  if (!value) return undefined;
  const numeric = Number(unformatNumber(value));
  return Number.isFinite(numeric) ? numeric : undefined;
}

/** Split comma-separated segments into trimmed non-empty strings. */
function splitCommaSegments(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function FormattedNumberField({
  control,
  name,
  label,
  placeholder,
  className,
}: {
  control: Control<QuickAddDealFormValues>;
  name: FieldPath<QuickAddDealFormValues>;
  label: React.ReactNode;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={placeholder}
              autoComplete="off"
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(e) =>
                field.onChange(formatNumberWithCommas(e.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export type QuickAddThemeOption = {
  id: string;
  name: string;
  status: string;
};

export type QuickAddDealFormProps = {
  onSuccess?: (data: { dealOpportunityId: string }) => void;
  /** When set (e.g. dialog), Cancel runs this instead of browser back. */
  onCancel?: () => void;
  className?: string;
  /** From `quick-add` route loader; when omitted, themes load via TRPC (e.g. dialog). */
  themes?: QuickAddThemeOption[];
};

const defaultFormValues: QuickAddDealFormValues = {
  companyName: "",
  industry: "",
  location: "",
  revenueEstimate: "",
  ebitdaEstimate: "",
  ebitdaMarginEstimate: "",
  recurringRevenuePct: "",
  customerConcentrationPct: "",
  founderAgeEstimate: "",
  themeId: "",
  attractivenessScore: "",
  coverageStatus: "UNCONTACTED",
  businessModel: "",
  employees: "",
  revenueTtm: "",
  ebitdaTtm: "",
  grossMargin: "",
  revenueCagr: "",
  totalClients: "",
  top10Concentration: "",
  customerIndustries: [],
  revenueModelType: "",
  expansionModel: "",
  concentrationHigh: undefined,
  marginLow: undefined,
  vendorDependency: undefined,
  growthLevers: [],
  dealTeaser: "",
  sourceWebsite: "",
  brokerage: "",
  revenue: "",
  ebitda: "",
  ebitdaMargin: "",
  askingPrice: "",
  description: "",
  brokerFirstName: "",
  brokerLastName: "",
  brokerEmail: "",
  brokerPhone: "",
  brokerLinkedIn: "",
};

export function QuickAddDealForm({
  onSuccess,
  onCancel,
  className,
  themes: themesFromLoader,
}: QuickAddDealFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [growthLeverDraft, setGrowthLeverDraft] = React.useState("");
  const [industryDraft, setIndustryDraft] = React.useState("");

  const { data: themesFromQuery = [], isLoading: themesQueryLoading } =
    useQuery({
      ...trpc.themes.listForSelect.queryOptions(),
      enabled: themesFromLoader === undefined,
    });

  const themeOptions = themesFromLoader ?? themesFromQuery;
  const themesLoading = themesFromLoader === undefined && themesQueryLoading;

  const form = useForm<QuickAddDealFormValues>({
    resolver: zodResolver(QuickAddDealFormSchema),
    defaultValues: defaultFormValues,
  });

  const { mutate: createQuick, isPending } = useMutation(
    trpc.dealOpportunities.createOpportunityQuick.mutationOptions({
      onSuccess: (data) => {
        toast.success("Company and deal created");
        form.reset(defaultFormValues);
        setGrowthLeverDraft("");
        setIndustryDraft("");
        void router.invalidate();
        if (onSuccess) {
          onSuccess(data);
        } else {
          router.push(`/deal-opportunities/${data.dealOpportunityId}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add deal");
      },
    }),
  );

  function addGrowthLeversFromDraft() {
    const raw = growthLeverDraft.trim();
    if (!raw) return;
    const parts = raw.includes(",") ? splitCommaSegments(raw) : [raw];
    const current = form.getValues("growthLevers") ?? [];
    const next = [...current];
    for (const p of parts) {
      const t = p.trim();
      if (t && !next.includes(t)) next.push(t);
    }
    form.setValue("growthLevers", next, { shouldValidate: true });
    setGrowthLeverDraft("");
  }

  function addIndustriesFromDraft() {
    const raw = industryDraft.trim();
    if (!raw) return;
    const parts = splitCommaSegments(raw);
    const current = form.getValues("customerIndustries") ?? [];
    const next = [...current];
    for (const p of parts) {
      if (p && !next.includes(p)) next.push(p);
    }
    form.setValue("customerIndustries", next, { shouldValidate: true });
    setIndustryDraft("");
  }

  function onSubmit(values: QuickAddDealFormValues) {
    createQuick({
      companyName: values.companyName,
      industry: values.industry || undefined,
      location: values.location || undefined,
      revenueEstimate: parseNumericField(values.revenueEstimate),
      ebitdaEstimate: parseNumericField(values.ebitdaEstimate),
      ebitdaMarginEstimate: parseNumericField(values.ebitdaMarginEstimate),
      recurringRevenuePct: parseNumericField(values.recurringRevenuePct),
      customerConcentrationPct: parseNumericField(
        values.customerConcentrationPct,
      ),
      founderAgeEstimate: parseNumericField(values.founderAgeEstimate),
      themeId: values.themeId || undefined,
      attractivenessScore: parseNumericField(values.attractivenessScore),
      coverageStatus: values.coverageStatus,
      businessModel: values.businessModel || undefined,
      employees: parseNumericField(values.employees),
      revenueTtm: parseNumericField(values.revenueTtm),
      ebitdaTtm: parseNumericField(values.ebitdaTtm),
      grossMargin: parseNumericField(values.grossMargin),
      revenueCagr: parseNumericField(values.revenueCagr),
      totalClients: parseNumericField(values.totalClients),
      top10Concentration: parseNumericField(values.top10Concentration),
      customerIndustries:
        values.customerIndustries?.length > 0
          ? values.customerIndustries
          : undefined,
      revenueModelType: values.revenueModelType || undefined,
      expansionModel: values.expansionModel || undefined,
      concentrationHigh: values.concentrationHigh,
      marginLow: values.marginLow,
      vendorDependency: values.vendorDependency,
      growthLevers:
        values.growthLevers?.length > 0 ? values.growthLevers : undefined,
      dealTeaser: values.dealTeaser,
      sourceWebsite: values.sourceWebsite || undefined,
      brokerage: values.brokerage || undefined,
      revenue: parseNumericField(values.revenue),
      ebitda: parseNumericField(values.ebitda),
      ebitdaMargin: parseNumericField(values.ebitdaMargin),
      askingPrice: parseNumericField(values.askingPrice),
      description: values.description || undefined,
      brokerFirstName: values.brokerFirstName || undefined,
      brokerLastName: values.brokerLastName || undefined,
      brokerEmail: values.brokerEmail || undefined,
      brokerPhone: values.brokerPhone || undefined,
      brokerLinkedIn: values.brokerLinkedIn || undefined,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={className ?? "space-y-6"}
      >
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
            <TabsTrigger value="company" className="text-xs sm:text-sm">
              Company
            </TabsTrigger>
            <TabsTrigger value="financials" className="text-xs sm:text-sm">
              Financials
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs sm:text-sm">
              Risks & growth
            </TabsTrigger>
            <TabsTrigger value="deal" className="text-xs sm:text-sm">
              Deal & broker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-4 space-y-0">
            <FieldSet>
              <FieldLegend>Company</FieldLegend>
              <p className="text-muted-foreground mb-4 text-sm">
                Legal / operating name and profile. A normalized dedup key is
                generated automatically.
              </p>
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Manufacturing LLC"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chicago, IL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Industrial manufacturing"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coverageStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COVERAGE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="themeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment theme</FormLabel>
                      <Select
                        disabled={themesLoading}
                        value={field.value ? field.value : "none"}
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                themesLoading
                                  ? "Loading themes…"
                                  : "Select a theme (optional)"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No theme</SelectItem>
                          {themeOptions.map((theme) => (
                            <SelectItem key={theme.id} value={theme.id}>
                              {`${theme.name} (${theme.status})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessModel"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Business model</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="How the company makes money"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
            </FieldSet>
          </TabsContent>

          <TabsContent value="financials" className="mt-4 space-y-0">
            <FieldSet>
              <FieldLegend>Company financials & metrics</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormattedNumberField
                  control={form.control}
                  name="revenueEstimate"
                  label="Revenue estimate"
                  placeholder="e.g. 1,500,000"
                />
                <FormattedNumberField
                  control={form.control}
                  name="ebitdaEstimate"
                  label="EBITDA estimate"
                  placeholder="e.g. 300,000"
                />
                <FormattedNumberField
                  control={form.control}
                  name="ebitdaMarginEstimate"
                  label="EBITDA margin (0–1)"
                  placeholder="e.g. 0.2"
                />
                <FormattedNumberField
                  control={form.control}
                  name="recurringRevenuePct"
                  label="Recurring revenue %"
                  placeholder="e.g. 0.8"
                />
                <FormattedNumberField
                  control={form.control}
                  name="customerConcentrationPct"
                  label="Customer concentration %"
                  placeholder="e.g. 0.3"
                />
                <FormattedNumberField
                  control={form.control}
                  name="founderAgeEstimate"
                  label="Founder age estimate"
                  placeholder="e.g. 52"
                />
                <FormattedNumberField
                  control={form.control}
                  name="attractivenessScore"
                  label="Attractiveness score"
                  placeholder="e.g. 75"
                />
                <FormattedNumberField
                  control={form.control}
                  name="revenueTtm"
                  label="Revenue TTM"
                  placeholder="Trailing twelve months"
                />
                <FormattedNumberField
                  control={form.control}
                  name="ebitdaTtm"
                  label="EBITDA TTM"
                  placeholder="e.g. 300,000"
                />
                <FormattedNumberField
                  control={form.control}
                  name="grossMargin"
                  label="Gross margin (0–1)"
                  placeholder="e.g. 0.45"
                />
                <FormattedNumberField
                  control={form.control}
                  name="revenueCagr"
                  label="Revenue CAGR (0–1)"
                  placeholder="e.g. 0.15"
                />
                <FormattedNumberField
                  control={form.control}
                  name="employees"
                  label="Employees"
                  placeholder="Headcount"
                />
                <FormattedNumberField
                  control={form.control}
                  name="totalClients"
                  label="Total clients"
                  placeholder="e.g. 120"
                />
                <FormattedNumberField
                  control={form.control}
                  name="top10Concentration"
                  label="Top 10 concentration (0–1)"
                  placeholder="e.g. 0.4"
                />
                <FormField
                  control={form.control}
                  name="customerIndustries"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Customer industries</FormLabel>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="Type and press Enter, or comma-separate several"
                              value={industryDraft}
                              onChange={(e) => setIndustryDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addIndustriesFromDraft();
                                }
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={addIndustriesFromDraft}
                          >
                            Add
                          </Button>
                        </div>
                        {field.value && field.value.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1 pr-1"
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                                  aria-label={`Remove ${tag}`}
                                  onClick={() =>
                                    field.onChange(
                                      field.value.filter((t) => t !== tag),
                                    )
                                  }
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revenueModelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue model type</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expansionModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expansion model</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
            </FieldSet>
          </TabsContent>

          <TabsContent value="risks" className="mt-4 space-y-0">
            <FieldSet>
              <FieldLegend>Risks</FieldLegend>
              <FieldGroup className="flex flex-wrap gap-6">
                <FormField
                  control={form.control}
                  name="concentrationHigh"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(c) =>
                            field.onChange(c === true ? true : undefined)
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        High concentration
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marginLow"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(c) =>
                            field.onChange(c === true ? true : undefined)
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Low margin</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendorDependency"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(c) =>
                            field.onChange(c === true ? true : undefined)
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Vendor dependency
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>

              <FieldSeparator className="mt-6">Growth levers</FieldSeparator>
              <FormField
                control={form.control}
                name="growthLevers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Growth levers</FormLabel>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        {GROWTH_LEVER_OPTIONS.map((lever) => {
                          const label = lever.replace(/_/g, " ");
                          const has = field.value?.includes(lever);
                          return (
                            <Button
                              key={lever}
                              type="button"
                              variant={has ? "default" : "outline"}
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                const cur = field.value ?? [];
                                if (has) {
                                  field.onChange(
                                    cur.filter((l) => l !== lever),
                                  );
                                } else {
                                  field.onChange([...cur, lever]);
                                }
                              }}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add your own — Enter or Add"
                          value={growthLeverDraft}
                          onChange={(e) => setGrowthLeverDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addGrowthLeversFromDraft();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={addGrowthLeversFromDraft}
                        >
                          Add
                        </Button>
                      </div>
                      {field.value && field.value.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((lever) => (
                            <Badge
                              key={lever}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              <span>
                                {lever.includes("_")
                                  ? lever.replace(/_/g, " ")
                                  : lever}
                              </span>
                              <button
                                type="button"
                                className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
                                aria-label={`Remove ${lever}`}
                                onClick={() =>
                                  field.onChange(
                                    field.value.filter((l) => l !== lever),
                                  )
                                }
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldSet>
          </TabsContent>

          <TabsContent value="deal" className="mt-4 space-y-0">
            <FieldSet>
              <FieldLegend>Deal listing</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormField
                  control={form.control}
                  name="dealTeaser"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Deal title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Manufacturing Co — $5M revenue"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source website</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brokerage</FormLabel>
                      <FormControl>
                        <Input placeholder="Brokerage name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormattedNumberField
                  control={form.control}
                  name="revenue"
                  label="Listing revenue"
                  placeholder="e.g., 1,500,000"
                />
                <FormattedNumberField
                  control={form.control}
                  name="ebitda"
                  label="Listing EBITDA"
                  placeholder="e.g., 300,000"
                />
                <FormattedNumberField
                  control={form.control}
                  name="ebitdaMargin"
                  label="Listing EBITDA margin (0–1)"
                  placeholder="e.g., 0.2"
                />
                <FormattedNumberField
                  control={form.control}
                  name="askingPrice"
                  label="Asking price"
                  placeholder="e.g., 5,000,000"
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deal description..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>

              <FieldSeparator>Broker contact</FieldSeparator>
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormField
                  control={form.control}
                  name="brokerFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerLinkedIn"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>LinkedIn</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
            </FieldSet>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (onCancel ? onCancel() : router.back())}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Creating..." : "Create company & deal"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
