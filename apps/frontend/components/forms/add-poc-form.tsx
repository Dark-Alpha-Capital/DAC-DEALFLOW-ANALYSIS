"use client";

import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddPoc from "@/app/actions/add-poc";
// import { createPoc } from "@/app/actions/poc-actions"; // Assume an action like this will be created

export const addPocFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z
    .string()
    .email("Invalid email address.")
    .min(1, "Email is required."),
  workPhone: z.string().optional(),
});

export type AddPocFormValues = z.infer<typeof addPocFormSchema>;

interface AddPocFormProps {
  dealId: string;
  onSuccess?: () => void; // Callback to run on successful submission
}

const AddPocForm = ({ dealId, onSuccess }: AddPocFormProps) => {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AddPocFormValues>({
    resolver: zodResolver(addPocFormSchema),
    defaultValues: {
      name: "",
      email: "",
      workPhone: "",
    },
  });

  async function onSubmit(values: AddPocFormValues) {
    startTransition(async () => {
      try {
        const response = await AddPoc(values, dealId);

        if ("error" in response) {
          toast.error(response.error);
          return;
        } else if (response.type === "success") {
          toast.success(response.message || `${values.name} has been added.`);
          onSuccess?.();
        }
      } catch (error) {
        console.error("Submission error:", error);
        toast.error("An unexpected error occurred while adding the POC.");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormDescription>
                The full name of the point of contact.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="e.g., jane.doe@example.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The primary email address for communication.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="workPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Phone</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., +1 555-123-4567 (Optional)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The work phone number of the contact (optional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding POC..." : "Add Point of Contact"}
        </Button>
      </form>
    </Form>
  );
};

export default AddPocForm;
