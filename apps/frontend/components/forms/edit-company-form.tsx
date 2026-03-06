"use client";

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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Company } from "db";

const COVERAGE_STATUSES = ["UNCONTACTED", "CONTACTED", "IN_DISCUSSION", "UNDER_LOI", "CLOSED", "PASSED"] as const;

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
    },
  });

  function onSubmit(values: EditCompanyFormSchemaType) {
    updateCompany({ ...values, id: company.id });
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
                    <Input placeholder="e.g., Technology, SaaS" {...field} />
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
          <FieldLegend variant="label">Financial Profile</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
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
