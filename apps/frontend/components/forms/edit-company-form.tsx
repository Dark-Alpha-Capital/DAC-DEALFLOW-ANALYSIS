
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Company } from "@repo/db";

const COVERAGE_STATUSES = ["UNCONTACTED", "CONTACTED", "IN_DISCUSSION", "UNDER_LOI", "CLOSED", "PASSED"] as const;

const GROWTH_LEVER_OPTIONS = [
  "upsell_existing_clients",
  "managed_services_expansion",
  "AI_services",
  "salesforce_scale",
] as const;

const EditCompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  normalizedName: z.string().min(1, "Normalized name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: z.coerce.number().optional(),
  ebitdaEstimate: z.coerce.number().optional(),
  ebitdaMarginEstimate: z.coerce.number().optional(),
  recurringRevenuePct: z.coerce.number().optional(),
  customerConcentrationPct: z.coerce.number().optional(),
  founderAgeEstimate: z.coerce.number().optional(),
  themeId: z.string().optional(),
  attractivenessScore: z.coerce.number().optional(),
  coverageStatus: z.enum(COVERAGE_STATUSES).optional(),
  businessModel: z.string().optional(),
  employees: z.coerce.number().optional(),
  revenueTtm: z.coerce.number().optional(),
  ebitdaTtm: z.coerce.number().optional(),
  grossMargin: z.coerce.number().optional(),
  revenueCagr: z.coerce.number().optional(),
  totalClients: z.coerce.number().optional(),
  top10Concentration: z.coerce.number().optional(),
  customerIndustries: z.string().optional(),
  revenueModelType: z.string().optional(),
  expansionModel: z.string().optional(),
  concentrationHigh: z.boolean().optional(),
  marginLow: z.boolean().optional(),
  vendorDependency: z.boolean().optional(),
  growthLevers: z.array(z.string()).optional(),
});

export type EditCompanyFormSchemaType = z.infer<typeof EditCompanyFormSchema>;

export default function EditCompanyForm({ company }: { company: Company }) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: updateCompany, isPending } = useMutation(
    trpc.companies.update.mutationOptions({
      onSuccess: () => {
        toast.success("Company updated successfully");
        router.push(`/companies/${company.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update company");
      },
    }),
  );

  const form = useForm<EditCompanyFormSchemaType>({
    resolver: zodResolver(EditCompanyFormSchema),
    defaultValues: {
      name: company.name,
      normalizedName: company.normalizedName,
      industry: company.industry ?? "",
      location: company.location ?? "",
      revenueEstimate: company.revenueEstimate ?? undefined,
      ebitdaEstimate: company.ebitdaEstimate ?? undefined,
      ebitdaMarginEstimate: company.ebitdaMarginEstimate ?? undefined,
      recurringRevenuePct: company.recurringRevenuePct ?? undefined,
      customerConcentrationPct: company.customerConcentrationPct ?? undefined,
      founderAgeEstimate: company.founderAgeEstimate ?? undefined,
      themeId: company.themeId ?? "",
      attractivenessScore: company.attractivenessScore ?? undefined,
      coverageStatus: company.coverageStatus,
      businessModel: company.businessModel ?? "",
      employees: company.employees ?? undefined,
      revenueTtm: company.revenueTtm ?? undefined,
      ebitdaTtm: company.ebitdaTtm ?? undefined,
      grossMargin: company.grossMargin ?? undefined,
      revenueCagr: company.revenueCagr ?? undefined,
      totalClients: company.totalClients ?? undefined,
      top10Concentration: company.top10Concentration ?? undefined,
      customerIndustries: company.customerIndustries?.join(", ") ?? "",
      revenueModelType: company.revenueModelType ?? "",
      expansionModel: company.expansionModel ?? "",
      concentrationHigh: company.concentrationHigh ?? false,
      marginLow: company.marginLow ?? false,
      vendorDependency: company.vendorDependency ?? false,
      growthLevers: company.growthLevers ?? [],
    },
  });

  function onSubmit(values: EditCompanyFormSchemaType) {
    const customerIndustries = values.customerIndustries
      ? values.customerIndustries
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    updateCompany({
      ...values,
      id: company.id,
      customerIndustries,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Company Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corporation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="normalizedName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Normalized Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="acme_corporation (for deduplication)" {...field} />
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
                    <Input placeholder="e.g., cybersecurity VAR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., advisory + reseller hybrid" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employees</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 16"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
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
                    <Input placeholder="e.g., New York, NY" {...field} />
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
                  <FormLabel>Coverage Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
          </FieldGroup>

          <FieldSeparator>Financials & Metrics</FieldSeparator>
          <FieldLegend variant="label">Financial Profile (TTM)</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="revenueTtm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue TTM (M)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 142.7"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ebitdaTtm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA TTM (M)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 8.3"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grossMargin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gross Margin (0–1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 0.101"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revenueCagr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue CAGR (0–1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 0.222"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revenueEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue Estimate</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1500000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ebitdaEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA Estimate</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 300000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ebitdaMarginEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA Margin (0–1)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 0.2 for 20%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recurringRevenuePct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurring Revenue %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 0.8 for 80%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerConcentrationPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Concentration %</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 0.3 for 30%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="founderAgeEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Founder Age Estimate</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 45" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="attractivenessScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attractiveness Score</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 75" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="themeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional theme reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <FieldSeparator>Customers</FieldSeparator>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="totalClients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Clients</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 200"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="top10Concentration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top 10 Concentration (0–1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 0.85"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerIndustries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industries (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FS, healthcare, gov, tech" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <FieldSeparator>Revenue Model</FieldSeparator>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="revenueModelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue Model Type</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., recurring SaaS resale" {...field} />
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
                  <FormLabel>Expansion Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., account-based growth" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <FieldSeparator>Risks</FieldSeparator>
          <FieldGroup className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="concentrationHigh"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">High concentration</FormLabel>
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
                      checked={field.value}
                      onCheckedChange={field.onChange}
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
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Vendor dependency</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <FieldSeparator>Growth Levers</FieldSeparator>
          <FieldGroup className="flex flex-wrap gap-4">
            {GROWTH_LEVER_OPTIONS.map((lever) => (
              <FormField
                key={lever}
                control={form.control}
                name="growthLevers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(lever)}
                        onCheckedChange={(checked) => {
                          const current = field.value ?? [];
                          field.onChange(
                            checked
                              ? [...current, lever]
                              : current.filter((l) => l !== lever),
                          );
                        }}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {lever.replace(/_/g, " ")}
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </FieldGroup>

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Update Company"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
