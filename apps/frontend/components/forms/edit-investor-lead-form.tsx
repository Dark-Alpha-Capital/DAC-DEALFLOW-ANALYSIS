
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
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
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
import type { InvestorLead } from "@repo/db";
import {
  EditInvestorLeadFormSchema,
  type EditInvestorLeadFormSchemaType,
} from "@/lib/zod-schemas/investor-forms";
import { INVESTOR_LEAD_STATUSES } from "@/lib/zod-schemas/shared-form-enums";

export default function EditInvestorLeadForm({
  lead,
}: {
  lead: InvestorLead;
}) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: updateLead, isPending } = useMutation(
    trpc.investorLeads.update.mutationOptions({
      onSuccess: () => {
        toast.success("Investor lead updated successfully");
        void router.invalidate();
        router.push(`/investor-leads/${lead.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update investor lead");
      },
    }),
  );

  const form = useForm<EditInvestorLeadFormSchemaType>({
    resolver: zodResolver(EditInvestorLeadFormSchema),
    defaultValues: {
      name: lead.name ?? "",
      source: lead.source ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      inferredType: lead.inferredType ?? "",
      notes: lead.notes ?? "",
      status: lead.status,
    },
  });

  function onSubmit(values: EditInvestorLeadFormSchemaType) {
    updateLead({ ...values, id: lead.id });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Investor Lead Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lead or contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., LinkedIn, referral, event"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inferredType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inferred Type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., HNWI, Family Office"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
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
                      {INVESTOR_LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
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
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      className="min-h-[80px]"
                      {...field}
                    />
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
              onClick={() => router.push(`/investor-leads/${lead.id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
