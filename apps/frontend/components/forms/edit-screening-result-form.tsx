"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { screenDealSchema, screenDealSchemaType } from "@/lib/schemas";
import { DealType, Sentiment } from "db/schema";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const EditScreeningResultForm = ({
  screeningId,
  dealId,
  title,
  explanation,
  sentiment,
  setDialogClose,
  dealType,
}: {
  screeningId: string;
  dealId: string;
  title: string;
  explanation: string;
  sentiment: Sentiment;
  dealType: DealType;
  setDialogClose: () => void;
}) => {
  const trpc = useTRPC();

  const { mutate: updateScreening, isPending } = useMutation(
    trpc.screenings.update.mutationOptions({
      onSuccess: () => {
        toast.success("Screening result updated successfully");
        setDialogClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update screening result");
      },
    })
  );

  const form = useForm<screenDealSchemaType>({
    resolver: zodResolver(screenDealSchema),
    defaultValues: {
      title,
      explanation,
      sentiment,
    },
  });

  function onSubmit(data: screenDealSchemaType) {
    updateScreening({
      screeningId,
      dealId,
      dealType,
      title: data.title,
      explanation: data.explanation,
      sentiment: data.sentiment,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter the title" {...field} />
              </FormControl>
              <FormDescription>
                Provide a title for the screen deal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Explanation</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter the explanation"
                  className="resize-none"
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide an explanation for the screen deal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sentiment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sentiment</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sentiment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="POSITIVE">Positive</SelectItem>
                  <SelectItem value="NEUTRAL">Neutral</SelectItem>
                  <SelectItem value="NEGATIVE">Negative</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select the sentiment for the screen deal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting" : "Submit"}
        </Button>
      </form>
    </Form>
  );
};

export default EditScreeningResultForm;
