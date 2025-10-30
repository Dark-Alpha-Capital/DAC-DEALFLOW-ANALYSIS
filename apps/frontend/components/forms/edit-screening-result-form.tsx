"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { useTransition } from "react";
import { DealType, Sentiment } from "@prisma/client";
import editScreenDealResult from "@/app/actions/edit-screen-deal-result";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const form = useForm<screenDealSchemaType>({
    resolver: zodResolver(screenDealSchema),
    defaultValues: {
      title,
      explanation,
      sentiment,
    },
  });

  async function onSubmit(data: screenDealSchemaType) {
    startTransition(async () => {
      const res = await editScreenDealResult(
        screeningId,
        dealId,
        data,
        dealType,
      );
      if (res.type === "success") {
        toast({
          title: "Edited Screening Result",
          description: res.message,
        });
        setDialogClose();
      }

      if (res.type === "error") {
        toast({
          title: "Error in editing screening result ☠️",
          variant: "destructive",
          description:
            res.message || "An error occurred, Please try again later!!!!",
        });
      }
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
