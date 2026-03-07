"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Lead } from "@repo/db";
import { ArrowLeft } from "lucide-react";

const ConvertLeadToCompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  normalizedName: z.string().min(1, "Normalized name is required"),
  industry: z.string().optional(),
  location: z.string().optional(),
  revenueEstimate: z.coerce.number().optional(),
  ebitdaEstimate: z.coerce.number().optional(),
});

type ConvertLeadToCompanyFormSchemaType = z.infer<
  typeof ConvertLeadToCompanyFormSchema
>;

function getDefaultValues(lead: Lead): ConvertLeadToCompanyFormSchemaType {
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

export default function ConvertLeadToCompanyForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: convertToCompany, isPending } = useMutation(
    trpc.leads.convertToCompany.mutationOptions({
      onSuccess: (data) => {
        toast.success("Lead converted to company");
        if (data.companyId) {
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

  const form = useForm<ConvertLeadToCompanyFormSchemaType>({
    resolver: zodResolver(ConvertLeadToCompanyFormSchema),
    defaultValues: getDefaultValues(lead),
  });

  function onSubmit(values: ConvertLeadToCompanyFormSchemaType) {
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
                      type="number"
                      placeholder="e.g., 1500000"
                      {...field}
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
                      type="number"
                      placeholder="e.g., 300000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`/leads/${lead.id}`} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Lead
              </Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Converting..." : "Convert to Company"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
