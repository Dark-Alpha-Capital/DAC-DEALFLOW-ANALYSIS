
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AddCompanyFormSchema,
  AddCompanyFormSchemaType,
} from "@/lib/zod-schemas/add-company-schema";
import { Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { formatNumberWithCommas } from "@/lib/utils";

export default function CreateNewCompanyForm() {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: createCompany, isPending } = useMutation(
    trpc.companies.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Company added successfully");
        form.reset();
        void router.invalidate();
        router.push(`/companies/${data.companyId}`);
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
      website: "",
      sector: "",
      stage: undefined,
      headquarters: "",
      description: "",
      revenue: undefined,
      ebitda: undefined,
      growthRate: undefined,
      employees: undefined,
    },
  });

  function onSubmit(values: AddCompanyFormSchemaType) {
    createCompany({
      name: values.name,
      normalizedName: values.name.toLowerCase().replace(/\s+/g, "_"),
      industry: values.sector,
      location: values.headquarters,
      revenueEstimate: values.revenue,
      ebitdaEstimate: values.ebitda,
      employees: values.employees,
    });
  }

  return (
    <Form {...form}>
      <Button onClick={() => form.reset()} variant={"outline"} size={"sm"}>
        Reset Form
      </Button>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:grid-cols-2 lg:mt-8"
      >
        {/* Company Information */}
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
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://www.acme.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sector</FormLabel>
              <FormControl>
                <Input placeholder="Technology" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Stage</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="STARTUP">Startup</SelectItem>
                  <SelectItem value="GROWTH">Growth</SelectItem>
                  <SelectItem value="MATURE">Mature</SelectItem>
                  <SelectItem value="TURNAROUND">Turnaround</SelectItem>
                  <SelectItem value="DISTRESSED">Distressed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="headquarters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headquarters</FormLabel>
              <FormControl>
                <Input placeholder="San Francisco, CA" {...field} />
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
              <FormLabel>Number of Employees *</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="50"
                  value={
                    field.value !== undefined
                      ? formatNumberWithCommas(String(field.value))
                      : ""
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    // Only allow whole numbers (no decimals for employees)
                    if (!/^\d*$/.test(rawValue)) return;
                    if (rawValue === "") {
                      field.onChange(undefined);
                    } else {
                      const num = parseInt(rawValue, 10);
                      field.onChange(isNaN(num) ? undefined : num);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Financial Information */}
        <FormField
          control={form.control}
          name="revenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annual Revenue ($)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="1,000,000"
                  value={
                    field.value !== undefined
                      ? formatNumberWithCommas(String(field.value))
                      : ""
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    // Only allow numbers (and optional decimal)
                    if (!/^\d*\.?\d*$/.test(rawValue)) return;
                    if (rawValue === "") {
                      field.onChange(undefined);
                    } else {
                      const num = parseFloat(rawValue);
                      field.onChange(isNaN(num) ? undefined : num);
                    }
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
              <FormLabel>EBITDA ($)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="200,000"
                  value={
                    field.value !== undefined
                      ? formatNumberWithCommas(String(field.value))
                      : ""
                  }
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, "");
                    // Only allow numbers (and optional decimal)
                    if (!/^\d*\.?\d*$/.test(rawValue)) return;
                    if (rawValue === "") {
                      field.onChange(undefined);
                    } else {
                      const num = parseFloat(rawValue);
                      field.onChange(isNaN(num) ? undefined : num);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="growthRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Growth Rate (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="25"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      field.onChange(undefined);
                    } else {
                      const num = parseFloat(val);
                      field.onChange(isNaN(num) ? undefined : num);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the company..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a brief overview of the company's business, products,
                and market position.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end md:col-span-2">
          <Button type="submit" disabled={isPending} className="">
            {isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Adding Company...
              </div>
            ) : (
              "Add Company"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
