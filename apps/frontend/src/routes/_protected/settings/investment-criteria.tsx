import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  type InvestmentCriteriaProfileInput,
  investmentCriteriaProfileSchema,
  updateInvestmentCriteriaProfileSchema,
} from "@repo/schemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";
import { formatNumberWithCommas } from "@/lib/utils";
import { parseOptionalNumericInput } from "@/lib/zod-schemas/forms-common";
import { DEFAULT_PREFERRED_INDUSTRY_LABELS } from "@/lib/org-defaults";

const freeTextSchema = z.string().default("");

type CriteriaFormValues = Omit<
  InvestmentCriteriaProfileInput,
  | "preferredIndustries"
  | "excludedIndustries"
  | "geographies"
  | "revenueScoreBands"
> & {
  preferredIndustriesText: string;
  excludedIndustriesText: string;
  geographiesText: string;
  revenueScoreBandsText: string;
};

function toPreferredIndustriesText(
  industries: InvestmentCriteriaProfileInput["preferredIndustries"],
) {
  if (industries.length === 0) {
    return DEFAULT_PREFERRED_INDUSTRY_LABELS.join("\n");
  }
  return industries
    .map((industry) =>
      industry.aliases.length > 0
        ? `${industry.label}|${industry.aliases.join(", ")}`
        : industry.label,
    )
    .join("\n");
}

function parsePreferredIndustries(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, aliasesPart = ""] = line.split("|");
      return {
        label: labelPart?.trim() || "",
        aliases: aliasesPart
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
      };
    });
}

function toSimpleListText(values: string[]) {
  return values.join(", ");
}

function parseSimpleList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toRevenueBandsText(
  bands: InvestmentCriteriaProfileInput["revenueScoreBands"],
) {
  return bands
    .map((band) => `${band.min ?? ""},${band.max ?? ""},${band.score}`)
    .join("\n");
}

function parseRevenueBands(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [min, max, score] = line.split(",").map((part) => part.trim());
      return {
        min: min ? Number(min) : null,
        max: max ? Number(max) : null,
        score: Number(score),
      };
    });
}

function toFormValues(profile: {
  key: string;
  version: string;
  firmName: string;
  ebitdaMin: number;
  ebitdaMax: number;
  revenueMin: number | null;
  revenueMax: number | null;
  ebitdaMarginMin: number | null;
  ownershipNotes: string | null;
  customerConcentrationIdealMax: number | null;
  customerConcentrationWarnAbove: number | null;
  positiveScreensMd: string | null;
  negativeScreensMd: string | null;
  weights: { ebitdaFit: number; revenue: number; industry: number };
  revenueScoreWhenMissing: number;
  criteriaNarrativeMd: string | null;
  icRubricMd: string | null;
  preferredIndustries: InvestmentCriteriaProfileInput["preferredIndustries"];
  excludedIndustries: InvestmentCriteriaProfileInput["excludedIndustries"];
  geographies: InvestmentCriteriaProfileInput["geographies"];
  revenueScoreBands: InvestmentCriteriaProfileInput["revenueScoreBands"];
}): CriteriaFormValues {
  return {
    key: profile.key,
    version: profile.version,
    firmName: profile.firmName,
    ebitdaMin: profile.ebitdaMin,
    ebitdaMax: profile.ebitdaMax,
    revenueMin: profile.revenueMin,
    revenueMax: profile.revenueMax,
    ebitdaMarginMin: profile.ebitdaMarginMin,
    ownershipNotes: profile.ownershipNotes ?? "",
    customerConcentrationIdealMax: profile.customerConcentrationIdealMax,
    customerConcentrationWarnAbove: profile.customerConcentrationWarnAbove,
    positiveScreensMd: profile.positiveScreensMd ?? "",
    negativeScreensMd: profile.negativeScreensMd ?? "",
    weightEbitdaFit: profile.weights.ebitdaFit,
    weightRevenue: profile.weights.revenue,
    weightIndustry: profile.weights.industry,
    revenueScoreWhenMissing: profile.revenueScoreWhenMissing,
    criteriaNarrativeMd: profile.criteriaNarrativeMd ?? "",
    icRubricMd: profile.icRubricMd ?? "",
    preferredIndustriesText: toPreferredIndustriesText(profile.preferredIndustries),
    excludedIndustriesText: toSimpleListText(profile.excludedIndustries),
    geographiesText: toSimpleListText(profile.geographies),
    revenueScoreBandsText: toRevenueBandsText(profile.revenueScoreBands),
  };
}

function toInput(values: CriteriaFormValues): InvestmentCriteriaProfileInput {
  return updateInvestmentCriteriaProfileSchema.parse({
    key: values.key,
    version: values.version,
    firmName: values.firmName,
    ebitdaMin: values.ebitdaMin,
    ebitdaMax: values.ebitdaMax,
    revenueMin: values.revenueMin,
    revenueMax: values.revenueMax,
    ebitdaMarginMin: values.ebitdaMarginMin,
    preferredIndustries: parsePreferredIndustries(values.preferredIndustriesText),
    excludedIndustries: parseSimpleList(values.excludedIndustriesText),
    geographies: parseSimpleList(values.geographiesText),
    ownershipNotes: values.ownershipNotes,
    customerConcentrationIdealMax: values.customerConcentrationIdealMax,
    customerConcentrationWarnAbove: values.customerConcentrationWarnAbove,
    positiveScreensMd: values.positiveScreensMd,
    negativeScreensMd: values.negativeScreensMd,
    weightEbitdaFit: values.weightEbitdaFit,
    weightRevenue: values.weightRevenue,
    weightIndustry: values.weightIndustry,
    revenueScoreWhenMissing: values.revenueScoreWhenMissing,
    revenueScoreBands: parseRevenueBands(values.revenueScoreBandsText),
    criteriaNarrativeMd: values.criteriaNarrativeMd,
    icRubricMd: values.icRubricMd,
  });
}

export const Route = createFileRoute("/_protected/settings/investment-criteria")({
  head: () => ({
    meta: [{ title: "Investment Criteria — Dark Alpha Capital" }],
  }),
  component: InvestmentCriteriaSettingsRoute,
});

function InvestmentCriteriaSettingsRoute() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const profileQuery = useQuery(
    trpc.organizationSettings.getInvestmentCriteria.queryOptions(),
  );

  const form = useForm<CriteriaFormValues>({
    resolver: zodResolver(
      investmentCriteriaProfileSchema
        .omit({
          preferredIndustries: true,
          excludedIndustries: true,
          geographies: true,
          revenueScoreBands: true,
        })
        .extend({
          preferredIndustriesText: freeTextSchema,
          excludedIndustriesText: freeTextSchema,
          geographiesText: freeTextSchema,
          revenueScoreBandsText: freeTextSchema,
        }),
    ),
    defaultValues: {
      key: "default",
      version: "1",
      firmName: "",
      ebitdaMin: 1_000_000,
      ebitdaMax: 10_000_000,
      revenueMin: 1_000_000,
      revenueMax: 100_000_000,
      ebitdaMarginMin: null,
      ownershipNotes: "",
      customerConcentrationIdealMax: 25,
      customerConcentrationWarnAbove: 40,
      positiveScreensMd: "",
      negativeScreensMd: "",
      weightEbitdaFit: 0.5,
      weightRevenue: 0.2,
      weightIndustry: 0.3,
      revenueScoreWhenMissing: 50,
      criteriaNarrativeMd: "",
      icRubricMd: "",
      preferredIndustriesText: DEFAULT_PREFERRED_INDUSTRY_LABELS.join("\n"),
      excludedIndustriesText: "",
      geographiesText: "",
      revenueScoreBandsText: "",
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(toFormValues(profileQuery.data));
    }
  }, [form, profileQuery.data]);

  const updateMutation = useMutation(
    trpc.organizationSettings.updateInvestmentCriteria.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.organizationSettings.getInvestmentCriteria.queryKey(),
        });
        toast.success("Investment criteria updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update criteria");
      },
    }),
  );

  const rescreenMutation = useMutation(
    trpc.organizationSettings.rescreenAllDeals.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Rescreened ${result.rescoredCount} deals`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to rescreen deals");
      },
    }),
  );

  return (
    <section className="block-space-mini container max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Investment Criteria</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control the deterministic screening rules and IC prompt criteria from one place.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit((values) => updateMutation.mutate(toInput(values)))(
              event,
            );
          }}
          className="space-y-6"
        >
          <div className="bg-card/40 space-y-4 rounded-xl border p-4 sm:p-6">
            <h2 className="text-sm font-semibold">Firm profile</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <CurrencyNumberField
                form={form}
                name="ebitdaMin"
                label="EBITDA min"
                description="Hard fail below this number."
              />
              <CurrencyNumberField
                form={form}
                name="ebitdaMax"
                label="EBITDA max"
                description="Hard fail above this number."
              />
              <CurrencyNumberField form={form} name="revenueMin" label="Revenue min" />
              <CurrencyNumberField form={form} name="revenueMax" label="Revenue max" />
              <NumberField
                form={form}
                name="ebitdaMarginMin"
                label="EBITDA margin min"
                step={0.01}
                description="Use decimal form, e.g. 0.1 for 10%."
              />
              <FormField
                control={form.control}
                name="firmName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firm name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dark Alpha Capital" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="bg-card/40 space-y-4 rounded-xl border p-4 sm:p-6">
            <h2 className="text-sm font-semibold">Industries and geography</h2>
            <FormField
              control={form.control}
              name="preferredIndustriesText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred industries</FormLabel>
                  <FormControl>
                    <TagInput
                      value={
                        field.value
                          ? field.value
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .map((line) => line.split("|")[0]?.trim() || "")
                              .filter(Boolean)
                              .slice(0, 5)
                          : []
                      }
                      onChange={(tags) => field.onChange(tags.join("\n"))}
                      maxTags={5}
                      placeholder="Type an industry and press Enter"
                    />
                  </FormControl>
                  <FormDescription>
                    Press Enter to add. Maximum 5 industries.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LongTextField
              form={form}
              name="excludedIndustriesText"
              label="Excluded industries"
              description="Comma-separated."
              rows={3}
            />
            <LongTextField
              form={form}
              name="geographiesText"
              label="Geographies"
              description="Comma-separated."
              rows={3}
            />
          </div>

          <div className="bg-card/40 space-y-4 rounded-xl border p-4 sm:p-6">
            <h2 className="text-sm font-semibold">Scoring</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                form={form}
                name="weightEbitdaFit"
                label="EBITDA weight"
                step={0.1}
              />
              <NumberField
                form={form}
                name="weightRevenue"
                label="Revenue weight"
                step={0.1}
              />
              <NumberField
                form={form}
                name="weightIndustry"
                label="Industry weight"
                step={0.1}
              />
              <NumberField
                form={form}
                name="revenueScoreWhenMissing"
                label="Revenue score when missing"
              />
            </div>
            <LongTextField
              form={form}
              name="revenueScoreBandsText"
              label="Revenue score bands"
              description="One row per line as `min,max,score`. Leave min or max blank for open-ended."
              rows={6}
            />
          </div>

          <div className="bg-card/40 space-y-4 rounded-xl border p-4 sm:p-6">
            <h2 className="text-sm font-semibold">Soft rules and narrative</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                form={form}
                name="customerConcentrationIdealMax"
                label="Customer concentration ideal max"
              />
              <NumberField
                form={form}
                name="customerConcentrationWarnAbove"
                label="Customer concentration warn above"
              />
            </div>
            <LongTextField
              form={form}
              name="ownershipNotes"
              label="Ownership notes"
              rows={3}
            />
            <LongTextField
              form={form}
              name="positiveScreensMd"
              label="Positive screens"
              rows={6}
            />
            <LongTextField
              form={form}
              name="negativeScreensMd"
              label="Negative screens"
              rows={6}
            />
            <FormField
              control={form.control}
              name="criteriaNarrativeMd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criteria narrative markdown</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      height={320}
                      placeholder="Describe what you look for, soft rules, and what you avoid…"
                    />
                  </FormControl>
                  <FormDescription>
                    This feeds the IC scorer prompt.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LongTextField
              form={form}
              name="icRubricMd"
              label="IC rubric markdown"
              rows={8}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending || profileQuery.isLoading}>
              {updateMutation.isPending ? "Saving..." : "Save criteria"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={rescreenMutation.isPending || profileQuery.isLoading}
              onClick={() => rescreenMutation.mutate()}
            >
              {rescreenMutation.isPending ? "Rescreening..." : "Rescreen all deals"}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}

function LongTextField({
  form,
  name,
  label,
  description,
  rows,
}: {
  form: UseFormReturn<CriteriaFormValues>;
  name: keyof CriteriaFormValues;
  label: string;
  description?: string;
  rows: number;
}) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea rows={rows} {...field} value={(field.value as string) ?? ""} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CurrencyNumberField({
  form,
  name,
  label,
  description,
}: {
  form: UseFormReturn<CriteriaFormValues>;
  name: "ebitdaMin" | "ebitdaMax" | "revenueMin" | "revenueMax";
  label: string;
  description?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="e.g., 1,000,000"
              value={
                field.value !== undefined && field.value !== null
                  ? formatNumberWithCommas(String(field.value))
                  : ""
              }
              onChange={(event) => {
                const parsed = parseOptionalNumericInput(event.target.value);
                if (parsed === null) return;
                field.onChange(parsed === undefined ? null : parsed);
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  form,
  name,
  label,
  description,
  step = 1,
}: {
  form: UseFormReturn<CriteriaFormValues>;
  name: keyof CriteriaFormValues;
  label: string;
  description?: string;
  step?: number;
}) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              value={field.value ?? ""}
              onChange={(event) => {
                const next = event.target.value.trim();
                field.onChange(next === "" ? null : Number(next));
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
