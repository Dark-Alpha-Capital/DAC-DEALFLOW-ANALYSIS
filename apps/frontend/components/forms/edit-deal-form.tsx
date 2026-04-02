
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
import { Textarea } from "@/components/ui/textarea";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { DealOpportunity } from "@repo/db";

const EditDealFormSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  dealTeaser: z.string().optional(),
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export type EditDealFormSchemaType = z.infer<typeof EditDealFormSchema>;

export default function EditDealForm({ opp }: { opp: DealOpportunity }) {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: companies = [] } = useQuery(trpc.companies.listForSelect.queryOptions());

  const { mutate: updateDeal, isPending } = useMutation(
    trpc.dealOpportunities.updateOpportunity.mutationOptions({
      onSuccess: () => {
        toast.success("Deal updated successfully");
        router.push(`/deal-opportunities/${opp.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update deal");
      },
    }),
  );

  const form = useForm<EditDealFormSchemaType>({
    resolver: zodResolver(EditDealFormSchema),
    defaultValues: {
      companyId: opp.companyId,
      sourceWebsite: opp.sourceWebsite ?? "",
      brokerage: opp.brokerage ?? "",
      revenue: opp.revenue ?? undefined,
      ebitda: opp.ebitda ?? undefined,
      ebitdaMargin: opp.ebitdaMargin ?? undefined,
      askingPrice: opp.askingPrice ?? undefined,
      dealTeaser: opp.dealTeaser ?? "",
      description: opp.description ?? "",
      brokerFirstName: opp.brokerFirstName ?? "",
      brokerLastName: opp.brokerLastName ?? "",
      brokerEmail: opp.brokerEmail ?? "",
      brokerPhone: opp.brokerPhone ?? "",
      brokerLinkedIn: opp.brokerLinkedIn ?? "",
    },
  });

  function onSubmit(values: EditDealFormSchemaType) {
    updateDeal({ ...values, id: opp.id });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Deal Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={companies.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={companies.length === 0 ? "Add a company first" : "Select company"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
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
              name="sourceWebsite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Website</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com" {...field} />
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
            <FormField
              control={form.control}
              name="dealTeaser"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Deal Teaser</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief teaser..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Deal description..." className="min-h-[100px]" {...field} />
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
                    <Input type="number" placeholder="e.g., 1500000" {...field} />
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
                    <Input type="number" placeholder="e.g., 300000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ebitdaMargin"
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
              name="askingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asking Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000000" {...field} />
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
              name="brokerFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
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
                  <FormLabel>Last Name</FormLabel>
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="broker@example.com" {...field} />
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
                    <Input type="tel" placeholder="123-456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brokerLinkedIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://linkedin.com/in/..." {...field} />
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
            <Button type="submit" disabled={isPending || companies.length === 0}>
              {isPending ? "Saving..." : "Update Deal"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
