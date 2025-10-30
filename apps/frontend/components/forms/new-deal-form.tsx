"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Textarea } from "../ui/textarea";
import { useTransition } from "react";

import { useRouter } from "next/navigation";
import AddDealToDB from "@/app/actions/add-deal";
import { toast } from "sonner";

export const NewDealFormSchema = z.object({
  first_name: z.optional(z.string()),
  last_name: z.optional(z.string()),
  email: z.optional(z.string().email("Invalid email address")), // Added email validation
  linkedinurl: z.optional(z.string().url("Invalid URL")), // Added URL validation
  deal_caption: z
    .string()
    .min(5, { message: "Deal caption should be at least 5 characters long" }),
  title: z
    .string()
    .min(5, { message: "Title should be at least 5 characters long" }),
  work_phone: z.optional(z.string()), // Consider adding phone number validation if needed
  revenue: z.coerce.number().positive("Revenue must be a positive number"), // Ensure positive number
  ebitda: z.coerce.number(), // Consider if this should also be positive
  ebitda_margin: z.coerce.number(), // Consider range validation (e.g., 0-100)
  gross_revenue: z.coerce
    .number()
    .positive("Gross revenue must be a positive number"), // Ensure positive number
  company_location: z.optional(z.string()),
  brokerage: z.string().min(1, "Brokerage is required"), // Ensure brokerage is not empty
  source_website: z.optional(z.string().url("Invalid URL")), // Added URL validation
  industry: z.string().min(1, "Industry is required"), // Ensure industry is not empty
  asking_price: z.optional(
    z.coerce.number().positive("Asking price must be a positive number"),
  ), // Ensure positive number
});

// infer type of formSchema
export type NewDealFormSchemaType = z.infer<typeof NewDealFormSchema>;

export default function CreateNewDealForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  // ...
  const form = useForm<NewDealFormSchemaType>({
    resolver: zodResolver(NewDealFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      linkedinurl: "",
      work_phone: "",
      title: "",
      deal_caption: "",
      revenue: undefined, // Use undefined for optional number fields for better placeholder behavior
      source_website: "",
      ebitda: undefined,
      ebitda_margin: undefined,
      gross_revenue: undefined,
      industry: "",
      asking_price: undefined,
      company_location: "",
      brokerage: "",
    },
  });

  // 2. Define a submit handler.
  function onSubmit(values: NewDealFormSchemaType) {
    startTransition(async () => {
      const response = await AddDealToDB(values);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Deal saved successfully");
      }
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
        {/* --- Contact Information --- */}
        <FormField
          control={form.control}
          name="first_name"
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
          name="last_name"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john.doe@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="linkedinurl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="work_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="123-456-7890" {...field} />
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
              <FormLabel>Brokerage *</FormLabel>
              <FormControl>
                <Input placeholder="Example Brokerage Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Deal Information --- */}
        <FormField
          control={form.control}
          name="deal_caption"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              {" "}
              {/* Span across two columns on medium+ screens */}
              <FormLabel>Deal Caption *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Profitable SaaS Business for Sale"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A short, descriptive caption for the deal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              {" "}
              {/* Span across two columns on medium+ screens */}
              <FormLabel>Title *</FormLabel>
              <FormControl>
                {/* Consider using Textarea if title can be long */}
                <Input
                  placeholder="e.g., Acquisition Opportunity: Established Tech Company"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The main title or headline for the deal listing.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="revenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Revenue *</FormLabel>
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
              <FormLabel>EBITDA *</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 300000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ebitda_margin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>EBITDA Margin (%) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 20"
                  {...field}
                  step="0.1"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gross_revenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gross Revenue *</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 2000000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="asking_price"
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
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry *</FormLabel>
              <FormControl>
                {/* Consider using a Select component if industries are predefined */}
                <Input
                  placeholder="e.g., Technology, SaaS, E-commerce"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company_location"
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
          name="source_website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Website</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://examplebrokerage.com/listing/..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Submission Button --- */}
        {/* Changed col-span-2 to md:col-span-2 to ensure it spans full width on small screens */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full md:col-span-2"
        >
          {isPending ? "Submitting..." : "Submit Deal"}
        </Button>
      </form>
    </Form>
  );
}
