"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import React, { useTransition } from "react";
import { z } from "zod";
import {
  dealSpecificationsFormSchema,
  dealSpecificationsFormSchemaType,
} from "@/lib/schemas";
import { Switch } from "@/components/ui/switch";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DealStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateDealSpecificationsAction } from "@/app/actions/update-deal-specifications";

const DealSpecificationsForm = ({
  dealUid,
  dealStatus,
  dealSeen,
  dealReviewed,
  dealPublished,
}: {
  dealUid: string;
  dealStatus: DealStatus;
  dealSeen: boolean;
  dealReviewed: boolean;
  dealPublished: boolean;
}) => {
  const [isPending, startTransition] = useTransition();

  const form = useForm<dealSpecificationsFormSchemaType>({
    resolver: zodResolver(dealSpecificationsFormSchema),
    defaultValues: {
      isPublished: dealPublished,
      isReviewed: dealReviewed,
      status: dealStatus,
      seen: dealSeen,
    },
  });

  function onSubmit(values: dealSpecificationsFormSchemaType) {
    startTransition(async () => {
      console.log(values);

      const { success, message } = await updateDealSpecificationsAction(
        values,
        dealUid,
      );

      console.log(success, message);

      if (success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deal Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a deal status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="SOLD">Sold</SelectItem>
                    <SelectItem value="UNDER_CONTRACT">
                      Under Contract
                    </SelectItem>
                    <SelectItem value="NOT_SPECIFIED">Not Specified</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  The current status of this deal.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isReviewed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Reviewed</FormLabel>
                  <FormDescription>
                    Mark this deal as reviewed by the team.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seen"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Seen</FormLabel>
                  <FormDescription>Mark this deal as seen</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Published</FormLabel>
                  <FormDescription>Mark this deal as published</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Updating...</span>
              </div>
            ) : (
              "Update"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default DealSpecificationsForm;
