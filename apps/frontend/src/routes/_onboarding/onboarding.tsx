import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "@/lib/routing/navigation-shim";
import { updateInvestmentCriteriaProfileSchema } from "@repo/schemas";
import { formatNumberWithCommas } from "@/lib/utils";
import { parseOptionalNumericInput } from "@/lib/zod-schemas/forms-common";
import { DEFAULT_PREFERRED_INDUSTRY_LABELS } from "@/lib/org-defaults";
import type { UseFormReturn } from "react-hook-form";

const createOrganizationFormSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required"),
  domain: z.string().trim().min(3, "Email domain is required"),
});

type CreateOrganizationFormValues = z.infer<
  typeof createOrganizationFormSchema
>;

const criteriaStepSchema = z.object({
  firmName: z.string().trim().min(1, "Firm name is required"),
  ebitdaMin: z.number().nonnegative(),
  ebitdaMax: z.number().positive(),
  revenueMin: z.number().nonnegative().nullable(),
  revenueMax: z.number().positive().nullable(),
  preferredIndustries: z
    .array(z.string().trim().min(1))
    .min(1, "Add at least one preferred industry")
    .max(5, "Maximum 5 preferred industries"),
  criteriaNarrativeMd: z
    .string()
    .trim()
    .min(1, "Add a short criteria narrative"),
});

type CriteriaStepValues = z.infer<typeof criteriaStepSchema>;

const playbookStepSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  summaryMd: z.string().trim().default(""),
  leversText: z.string().trim().min(1, "Add at least one lever"),
});

type SetupStep = "criteria" | "playbook";

const SETUP_STEPS: { id: SetupStep; label: string }[] = [
  { id: "criteria", label: "Investment criteria" },
  { id: "playbook", label: "Playbook" },
];

function StepIndicator({
  current,
  onSelect,
}: {
  current: SetupStep;
  onSelect: (step: SetupStep) => void;
}) {
  const currentIndex = SETUP_STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="mb-8 flex flex-wrap gap-2">
      {SETUP_STEPS.map((step, index) => {
        const isActive = step.id === current;
        const isDone = index < currentIndex;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-current={isActive ? "step" : undefined}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : isDone
                    ? "border-muted-foreground/40 text-foreground hover:bg-muted"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {index + 1}. {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function CurrencyNumberField({
  form,
  name,
  label,
  placeholder,
  allowEmpty = false,
}: {
  form: UseFormReturn<CriteriaStepValues>;
  name: "ebitdaMin" | "ebitdaMax" | "revenueMin" | "revenueMax";
  label: string;
  placeholder?: string;
  allowEmpty?: boolean;
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
              placeholder={placeholder ?? "e.g., 1,000,000"}
              value={
                field.value !== undefined && field.value !== null
                  ? formatNumberWithCommas(String(field.value))
                  : ""
              }
              onChange={(event) => {
                const parsed = parseOptionalNumericInput(event.target.value);
                if (parsed === null) return;
                if (parsed === undefined) {
                  field.onChange(allowEmpty ? null : 0);
                  return;
                }
                field.onChange(parsed);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const Route = createFileRoute("/_onboarding/onboarding")({
  head: () => ({
    meta: [{ title: "Organization Onboarding — Dark Alpha Capital" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [setupStep, setSetupStep] = useState<SetupStep>("criteria");

  const onboardingQuery = useQuery(
    trpc.organizations.getOnboardingState.queryOptions(),
  );

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationFormSchema),
    defaultValues: {
      name: "",
      domain: "",
    },
  });

  useEffect(() => {
    const suggestedDomain = onboardingQuery.data?.suggestedDomain;
    if (suggestedDomain && !form.getValues("domain")) {
      form.setValue("domain", suggestedDomain);
    }
  }, [form, onboardingQuery.data?.suggestedDomain]);

  async function refreshAfterOrgChange() {
    await queryClient.invalidateQueries({
      queryKey: trpc.organizations.getOnboardingState.queryKey(),
    });
    await router.invalidate();
  }

  const createOrganization = useMutation(
    trpc.organizations.createOrganization.mutationOptions({
      onSuccess: async () => {
        toast.success("Organization created");
        setSetupStep("criteria");
        await refreshAfterOrgChange();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const joinOrganization = useMutation(
    trpc.organizations.joinOrganizationByDomain.mutationOptions({
      onSuccess: async () => {
        toast.success("Joined organization");
        setSetupStep("criteria");
        await refreshAfterOrgChange();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const completeOnboarding = useMutation(
    trpc.organizations.completeOnboarding.mutationOptions({
      onSuccess: async () => {
        toast.success("Onboarding completed");
        await router.invalidate();
        router.push("/dashboard");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const skipOnboarding = useMutation(
    trpc.organizations.skipOnboarding.mutationOptions({
      onSuccess: async () => {
        toast.success("You can finish setup later from Settings");
        await router.invalidate();
        router.push("/dashboard");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const onboarding = onboardingQuery.data;
  const hasMembership = (onboarding?.memberships.length ?? 0) > 0;
  const organizationName =
    onboarding?.activeOrganizationName ??
    onboarding?.memberships[0]?.organizationName ??
    "your organization";
  const isOrgPending =
    createOrganization.isPending || joinOrganization.isPending;
  const isFinishPending =
    completeOnboarding.isPending || skipOnboarding.isPending;

  if (onboardingQuery.isLoading) {
    return (
      <section className="py-10">
        <p className="text-muted-foreground text-sm">Loading onboarding…</p>
      </section>
    );
  }

  return (
    <section className="py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Set up your organization</h1>
        <p className="text-muted-foreground">
          {hasMembership
            ? `Configure ${organizationName} step by step, or skip any step and finish later from Settings.`
            : "Create or join an organization to start using the platform."}
        </p>
      </div>

      {!hasMembership ? (
        <div className="space-y-6">
          {onboarding?.matchingOrganization ? (
            <div className="rounded-xl border p-6">
              <h2 className="text-lg font-semibold">
                Join {onboarding.matchingOrganization.name}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Your email domain matches an existing organization.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => joinOrganization.mutate()}
                  disabled={isOrgPending}
                >
                  {joinOrganization.isPending
                    ? "Joining..."
                    : "Join organization"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Create a new organization</h2>
            <Form {...form}>
              <form
                onSubmit={(event) => {
                  void form.handleSubmit((values) =>
                    createOrganization.mutate(values),
                  )(event);
                }}
                className="mt-4 space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Capital" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary email domain</FormLabel>
                      <FormControl>
                        <Input placeholder="acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isOrgPending}>
                  {createOrganization.isPending
                    ? "Creating..."
                    : "Create organization"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <StepIndicator current={setupStep} onSelect={setSetupStep} />

          {setupStep === "criteria" ? (
            <CriteriaSetupStep
              organizationName={organizationName}
              disabled={isFinishPending}
              onContinue={() => setSetupStep("playbook")}
              onSkipStep={() => setSetupStep("playbook")}
              onSkipAll={() => skipOnboarding.mutate()}
              skipAllPending={skipOnboarding.isPending}
            />
          ) : null}


          {setupStep === "playbook" ? (
            <PlaybookSetupStep
              disabled={isFinishPending}
              onFinish={() => completeOnboarding.mutate()}
              onSkipFinish={() => skipOnboarding.mutate()}
              onBack={() => setSetupStep("criteria")}
              finishPending={completeOnboarding.isPending}
              skipPending={skipOnboarding.isPending}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function CriteriaSetupStep({
  organizationName,
  disabled,
  onContinue,
  onSkipStep,
  onSkipAll,
  skipAllPending,
}: {
  organizationName: string;
  disabled: boolean;
  onContinue: () => void;
  onSkipStep: () => void;
  onSkipAll: () => void;
  skipAllPending: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const profileQuery = useQuery(
    trpc.organizationSettings.getInvestmentCriteria.queryOptions(),
  );

  const form = useForm<CriteriaStepValues>({
    resolver: zodResolver(criteriaStepSchema),
    defaultValues: {
      firmName: organizationName,
      ebitdaMin: 1_000_000,
      ebitdaMax: 10_000_000,
      revenueMin: 1_000_000,
      revenueMax: 100_000_000,
      preferredIndustries: [...DEFAULT_PREFERRED_INDUSTRY_LABELS],
      criteriaNarrativeMd: "",
    },
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;

    const seededForOtherFirm =
      profile.firmName.trim().toLowerCase() !==
        organizationName.trim().toLowerCase() &&
      profile.firmName.trim().toLowerCase() === "dark alpha capital";

    const profileIndustries = profile.preferredIndustries
      .map((industry) => industry.label)
      .filter(Boolean)
      .slice(0, 5);

    form.reset({
      firmName: organizationName || profile.firmName,
      ebitdaMin: profile.ebitdaMin,
      ebitdaMax: profile.ebitdaMax,
      revenueMin: profile.revenueMin,
      revenueMax: profile.revenueMax,
      preferredIndustries:
        seededForOtherFirm || profileIndustries.length === 0
          ? [...DEFAULT_PREFERRED_INDUSTRY_LABELS]
          : profileIndustries,
      criteriaNarrativeMd: seededForOtherFirm
        ? ""
        : profile.criteriaNarrativeMd,
    });
  }, [form, organizationName, profileQuery.data]);

  const saveMutation = useMutation(
    trpc.organizationSettings.updateInvestmentCriteria.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.organizationSettings.getInvestmentCriteria.queryKey(),
        });
        toast.success("Investment criteria saved");
        onContinue();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="rounded-xl border p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">Step 1 — Investment criteria</h2>
        <p className="text-muted-foreground text-sm">
          Set the size gates and sector focus your firm screens against. You can
          refine scoring weights later in Settings.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit((values) => {
              const profile = profileQuery.data;
              if (!profile) {
                toast.error("Criteria profile is still loading");
                return;
              }

              const preferredIndustries = values.preferredIndustries.map(
                (label) => ({ label, aliases: [] as string[] }),
              );
              const payload = updateInvestmentCriteriaProfileSchema.parse({
                key: profile.key,
                version: profile.version,
                firmName: values.firmName,
                ebitdaMin: values.ebitdaMin,
                ebitdaMax: values.ebitdaMax,
                revenueMin: values.revenueMin,
                revenueMax: values.revenueMax,
                ebitdaMarginMin: profile.ebitdaMarginMin,
                preferredIndustries,
                excludedIndustries: profile.excludedIndustries,
                geographies: profile.geographies,
                ownershipNotes: profile.ownershipNotes,
                customerConcentrationIdealMax:
                  profile.customerConcentrationIdealMax,
                customerConcentrationWarnAbove:
                  profile.customerConcentrationWarnAbove,
                positiveScreensMd: profile.positiveScreensMd,
                negativeScreensMd: profile.negativeScreensMd,
                weightEbitdaFit: profile.weights.ebitdaFit,
                weightRevenue: profile.weights.revenue,
                weightIndustry: profile.weights.industry,
                revenueScoreWhenMissing: profile.revenueScoreWhenMissing,
                revenueScoreBands: profile.revenueScoreBands,
                criteriaNarrativeMd: values.criteriaNarrativeMd,
                icRubricMd: profile.icRubricMd,
              });
              saveMutation.mutate(payload);
            })(event);
          }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="firmName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Firm display name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <CurrencyNumberField
              form={form}
              name="ebitdaMin"
              label="EBITDA min"
              placeholder="e.g., 1,000,000"
            />
            <CurrencyNumberField
              form={form}
              name="ebitdaMax"
              label="EBITDA max"
              placeholder="e.g., 10,000,000"
            />
            <CurrencyNumberField
              form={form}
              name="revenueMin"
              label="Revenue min"
              placeholder="e.g., 1,000,000"
              allowEmpty
            />
            <CurrencyNumberField
              form={form}
              name="revenueMax"
              label="Revenue max"
              placeholder="e.g., 100,000,000"
              allowEmpty
            />
          </div>

          <FormField
            control={form.control}
            name="preferredIndustries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred industries</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    maxTags={5}
                    placeholder="Type an industry and press Enter"
                    disabled={disabled || saveMutation.isPending}
                  />
                </FormControl>
                <FormDescription>
                  Press Enter to add a tag. Maximum 5 industries.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="criteriaNarrativeMd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Criteria narrative</FormLabel>
                <FormControl>
                  <MarkdownEditor
                    value={field.value}
                    onChange={field.onChange}
                    height={280}
                    placeholder="Describe what you look for, soft rules, and what you avoid…"
                  />
                </FormControl>
                <FormDescription>
                  Used in IC scoring prompts. Supports markdown formatting.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="submit"
              disabled={disabled || saveMutation.isPending || profileQuery.isLoading}
            >
              {saveMutation.isPending ? "Saving..." : "Save & continue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || saveMutation.isPending}
              onClick={onSkipStep}
            >
              Skip this step
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || skipAllPending}
              onClick={onSkipAll}
            >
              {skipAllPending ? "Skipping..." : "Skip entire setup"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function PlaybookSetupStep({
  disabled,
  onFinish,
  onSkipFinish,
  onBack,
  finishPending,
  skipPending,
}: {
  disabled: boolean;
  onFinish: () => void;
  onSkipFinish: () => void;
  onBack: () => void;
  finishPending: boolean;
  skipPending: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const playbookQuery = useQuery(
    trpc.organizationSettings.getPlaybook.queryOptions(),
  );

  const form = useForm<z.infer<typeof playbookStepSchema>>({
    resolver: zodResolver(playbookStepSchema),
    defaultValues: {
      title: "Value Creation Playbook",
      summaryMd: "",
      leversText: "",
    },
  });

  useEffect(() => {
    if (playbookQuery.data) {
      form.reset({
        title: playbookQuery.data.title,
        summaryMd: playbookQuery.data.summaryMd ?? "",
        leversText: playbookQuery.data.levers
          .map((lever) =>
            lever.descriptionMd
              ? `${lever.name}|${lever.descriptionMd}`
              : lever.name,
          )
          .join("\n"),
      });
    }
  }, [form, playbookQuery.data]);

  const saveMutation = useMutation(
    trpc.organizationSettings.updatePlaybook.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.organizationSettings.getPlaybook.queryKey(),
        });
        toast.success("Playbook saved");
        onFinish();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="rounded-xl border p-6">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">Step 2 — Value creation playbook</h2>
        <p className="text-muted-foreground text-sm">
          Capture the levers your firm uses after investment. These feed IC scoring
          prompts.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit((values) =>
              saveMutation.mutate({
                title: values.title,
                summaryMd: values.summaryMd || null,
                levers: values.leversText
                  .split("\n")
                  .map((entry) => entry.trim())
                  .filter(Boolean)
                  .map((entry) => {
                    const [name, descriptionMd = ""] = entry.split("|");
                    return {
                      name: name?.trim() || "",
                      descriptionMd: descriptionMd.trim() || null,
                    };
                  }),
              }),
            )(event);
          }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Playbook title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="summaryMd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leversText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Levers</FormLabel>
                <FormControl>
                  <Textarea
                    rows={8}
                    placeholder={
                      "Pricing|Pricing power and packaging\nBolt-ons|Adjacency M&A"
                    }
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  One per line. Optional description: `Name|description`
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || saveMutation.isPending}
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={
                disabled || saveMutation.isPending || playbookQuery.isLoading
              }
            >
              {saveMutation.isPending
                ? "Saving..."
                : finishPending
                  ? "Finishing..."
                  : "Save & finish"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || skipPending || saveMutation.isPending}
              onClick={onSkipFinish}
            >
              {skipPending ? "Skipping..." : "Skip & enter app"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
