"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

const QuickAddDealSchema = z.object({
  dealTeaser: z.string().min(1, "Deal title is required"),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  ebitdaMargin: z.coerce.number().optional(),
  askingPrice: z.coerce.number().optional(),
  description: z.string().optional(),
});

type QuickAddDealFormValues = z.infer<typeof QuickAddDealSchema>;

interface QuickAddDealDialogProps {
  trigger?: React.ReactNode;
}

export function QuickAddDealDialog({ trigger }: QuickAddDealDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const router = useRouter();
  const trpc = useTRPC();

  const form = useForm<QuickAddDealFormValues>({
    resolver: zodResolver(QuickAddDealSchema),
    defaultValues: {
      dealTeaser: "",
      sourceWebsite: "",
      brokerage: "",
      revenue: undefined,
      ebitda: undefined,
      ebitdaMargin: undefined,
      askingPrice: undefined,
      description: "",
    },
  });

  const { mutate: createQuick, isPending } = useMutation(
    trpc.dealOpportunities.createOpportunityQuick.mutationOptions({
      onSuccess: (data) => {
        toast.success("Deal created");
        setOpen(false);
        form.reset();
        router.push(`/deal-opportunities/${data.dealOpportunityId}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add deal");
      },
    }),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      setDetailsOpen(false);
    }
    setOpen(nextOpen);
  };

  function onSubmit(values: QuickAddDealFormValues) {
    createQuick({
      dealTeaser: values.dealTeaser,
      sourceWebsite: values.sourceWebsite || undefined,
      brokerage: values.brokerage || undefined,
      revenue: values.revenue,
      ebitda: values.ebitda,
      ebitdaMargin: values.ebitdaMargin,
      askingPrice: values.askingPrice,
      description: values.description || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            Quick add
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dealTeaser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Manufacturing Co - $5M Revenue"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 px-0 text-muted-foreground hover:text-foreground"
                >
                  {detailsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Add optional details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="sourceWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source website</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com"
                          {...field}
                        />
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
                  name="revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue</FormLabel>
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
                  name="ebitda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EBITDA</FormLabel>
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
                  name="ebitdaMargin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EBITDA margin (0–1)</FormLabel>
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
                  name="askingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asking price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 5000000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Deal description..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Creating..." : "Add deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
