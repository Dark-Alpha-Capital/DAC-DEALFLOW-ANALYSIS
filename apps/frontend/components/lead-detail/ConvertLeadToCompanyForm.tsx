
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
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
} from "@/components/ui/field";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Lead } from "@repo/db";
import { ArrowLeft } from "lucide-react";
import {
  convertLeadToCompanyFormSchema,
  parseOptionalNumericInput,
  type ConvertLeadToCompanyFormValues,
} from "@/lib/schemas";
import { formatNumberWithCommas } from "@/lib/utils";

export function getDefaultValues(lead: Lead): ConvertLeadToCompanyFormValues {
  const name = lead.normalizedCompanyName?.trim() || lead.rawTitle?.trim() || "";
  return {
    name,
    normalizedName: name,
    industry: lead.rawIndustry ?? "",
    location: lead.companyLocation ?? "",
    revenueEstimate: lead.revenue ?? undefined,
    ebitdaEstimate: lead.ebitda ?? undefined,
  };
}

interface ConvertLeadToCompanyFormProps {
  lead: Lead;
  onSuccess?: (data: { companyId: string }) => void;
  compact?: boolean;
}

export default function ConvertLeadToCompanyForm({
  lead,
  onSuccess,
  compact = false,
}: ConvertLeadToCompanyFormProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: convertToCompany, isPending } = useMutation(
    trpc.leads.convertToCompany.mutationOptions({
      onSuccess: (data) => {
        toast.success("Lead converted to company");
        if (onSuccess) {
          onSuccess(data);
        } else if (data.companyId) {
          router.push(`/companies/${data.companyId}`);
        } else {
          router.refresh();
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to convert lead");
      },
    }),
  );

  const form = useForm<ConvertLeadToCompanyFormValues>({
    resolver: zodResolver(convertLeadToCompanyFormSchema),
    defaultValues: getDefaultValues(lead),
  });

  function onSubmit(values: ConvertLeadToCompanyFormValues) {
    convertToCompany({
      id: lead.id,
      name: values.name,
      normalizedName: values.normalizedName,
      industry: values.industry || undefined,
      location: values.location || undefined,
      revenueEstimate: values.revenueEstimate,
      ebitdaEstimate: values.ebitdaEstimate,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Company Information (from lead)</FieldLegend>
          <p className="text-muted-foreground mb-4 text-sm">
            Review and edit the information below before creating the company.
          </p>
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
                    <Input
                      placeholder="acme_corporation (for deduplication)"
                      {...field}
                    />
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
              name="revenueEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue Estimate</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="e.g., 1,500,000"
                      value={
                        field.value !== undefined && field.value !== null
                          ? formatNumberWithCommas(String(field.value))
                          : ""
                      }
                      onChange={(e) => {
                        const parsed = parseOptionalNumericInput(e.target.value);
                        if (parsed === null) return;
                        field.onChange(parsed);
                      }}
                    />
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
                    <Input
                      type="text"
                      placeholder="e.g., 300,000"
                      value={
                        field.value !== undefined && field.value !== null
                          ? formatNumberWithCommas(String(field.value))
                          : ""
                      }
                      onChange={(e) => {
                        const parsed = parseOptionalNumericInput(e.target.value);
                        if (parsed === null) return;
                        field.onChange(parsed);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!compact && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={`/leads/${lead.id}`} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Lead
                </Link>
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Converting..." : "Convert to Company"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
