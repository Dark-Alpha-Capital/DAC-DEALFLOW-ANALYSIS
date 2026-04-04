
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
import {
  AddCompanyFormSchema,
  type AddCompanyFormSchemaType,
} from "@/lib/zod-schemas/company-forms";
import { COVERAGE_STATUSES } from "@/lib/zod-schemas/shared-form-enums";

export type { AddCompanyFormSchemaType };

export default function AddCompanyForm() {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: createCompany, isPending } = useMutation(
    trpc.companies.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Company saved successfully");
        form.reset();
        void router.invalidate();
        router.push("/companies");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add company");
      },
    }),
  );

  const form = useForm<AddCompanyFormSchemaType>({
    resolver: zodResolver(AddCompanyFormSchema),
    defaultValues: {
      name: "",
      normalizedName: "",
      industry: "",
      location: "",
      revenueEstimate: undefined,
      ebitdaEstimate: undefined,
      ebitdaMarginEstimate: undefined,
      recurringRevenuePct: undefined,
      customerConcentrationPct: undefined,
      founderAgeEstimate: undefined,
      themeId: "",
      attractivenessScore: undefined,
      coverageStatus: "UNCONTACTED",
    },
  });

  function onSubmit(values: AddCompanyFormSchemaType) {
    createCompany(values);
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
              name="coverageStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverage Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
            <FormField
              control={form.control}
              name="ebitdaMarginEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA Margin (0–1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 0.2 for 20%"
                      {...field}
                    />
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
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 0.8 for 80%"
                      {...field}
                    />
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
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 0.3 for 30%"
                      {...field}
                    />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Add Company"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
