import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldSeparator,
} from "@/components/ui/field";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Lead } from "@repo/db";
import {
  leadFormSchema,
  parseOptionalNumericInput,
  type LeadFormValues,
} from "@/lib/schemas";
import { formatNumberWithCommas } from "@/lib/utils";

export default function EditLeadForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: updateLead, isPending } = useMutation(
    trpc.leads.update.mutationOptions({
      onSuccess: () => {
        toast.success("Lead updated successfully");
        void router.invalidate();
        router.push(`/leads/${lead.id}`);
      },
      onError: (error) => {
        console.error(error);
        toast.error(error.message || "Failed to update lead");
      },
    }),
  );

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      sourceWebsite: lead.sourceWebsite,
      externalListingId: lead.externalListingId ?? "",
      rawTitle: lead.rawTitle,
      rawDescription: lead.rawDescription ?? "",
      rawIndustry: lead.rawIndustry ?? "",
      revenue: lead.revenue ?? undefined,
      ebitda: lead.ebitda ?? undefined,
      askingPrice: lead.askingPrice ?? undefined,
      brokerage: lead.brokerage ?? "",
      brokerFirstName: lead.brokerFirstName ?? "",
      brokerLastName: lead.brokerLastName ?? "",
      brokerEmail: lead.brokerEmail ?? "",
      brokerPhone: lead.brokerPhone ?? "",
      normalizedCompanyName: lead.normalizedCompanyName ?? "",
      companyLocation: lead.companyLocation ?? "",
    },
  });

  function onSubmit(values: LeadFormValues) {
    updateLead({ ...values, id: lead.id });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Lead Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="sourceWebsite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Website *</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/listing"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalListingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Listing ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Broker listing ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rawTitle"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Profitable SaaS Business for Sale"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rawDescription"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Deal description..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rawIndustry"
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
              name="companyLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New York, NY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue</FormLabel>
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
                        const parsed = parseOptionalNumericInput(
                          e.target.value,
                        );
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
              name="ebitda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA</FormLabel>
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
                        const parsed = parseOptionalNumericInput(
                          e.target.value,
                        );
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
              name="askingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asking Price</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="e.g., 5,000,000"
                      value={
                        field.value !== undefined && field.value !== null
                          ? formatNumberWithCommas(String(field.value))
                          : ""
                      }
                      onChange={(e) => {
                        const parsed = parseOptionalNumericInput(
                          e.target.value,
                        );
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

          <FieldSeparator>Broker / Contact</FieldSeparator>
          <FieldLegend variant="label">Broker Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
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
            <FormField
              control={form.control}
              name="brokerFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
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
                  <FormLabel>Broker Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
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
                  <FormLabel>Broker Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="broker@example.com"
                      {...field}
                    />
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
                  <FormLabel>Broker Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="123-456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="normalizedCompanyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Normalized Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="For deduplication" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Update Lead"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
