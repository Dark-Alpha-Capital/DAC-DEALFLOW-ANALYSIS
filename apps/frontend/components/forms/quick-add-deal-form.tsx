
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
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
   formatNumberWithCommas,
   unformatNumber,
 } from "@/lib/utils";

 const QuickAddDealSchema = z.object({
   dealTeaser: z.string().min(1, "Deal title is required"),
   sourceWebsite: z.string().optional(),
   brokerage: z.string().optional(),
   revenue: z.string().optional(),
   ebitda: z.string().optional(),
   ebitdaMargin: z.string().optional(),
   askingPrice: z.string().optional(),
   description: z.string().optional(),
 });

 type QuickAddDealFormValues = z.infer<typeof QuickAddDealSchema>;

 function parseNumericField(value?: string | null) {
   if (!value) return undefined;
   const numeric = Number(unformatNumber(value));
   return Number.isFinite(numeric) ? numeric : undefined;
 }

 export function QuickAddDealForm() {
   const router = useRouter();
   const trpc = useTRPC();

   const form = useForm<QuickAddDealFormValues>({
     resolver: zodResolver(QuickAddDealSchema),
     defaultValues: {
       dealTeaser: "",
       sourceWebsite: "",
       brokerage: "",
       revenue: "",
       ebitda: "",
       ebitdaMargin: "",
       askingPrice: "",
       description: "",
     },
   });

   const { mutate: createQuick, isPending } = useMutation(
     trpc.dealOpportunities.createOpportunityQuick.mutationOptions({
       onSuccess: (data) => {
         toast.success("Deal created");
         form.reset();
         router.push(`/deal-opportunities/${data.dealOpportunityId}`);
       },
       onError: (error) => {
         toast.error(error.message || "Failed to add deal");
       },
     }),
   );

   function onSubmit(values: QuickAddDealFormValues) {
     createQuick({
       dealTeaser: values.dealTeaser,
       sourceWebsite: values.sourceWebsite || undefined,
       brokerage: values.brokerage || undefined,
       revenue: parseNumericField(values.revenue),
       ebitda: parseNumericField(values.ebitda),
       ebitdaMargin: parseNumericField(values.ebitdaMargin),
       askingPrice: parseNumericField(values.askingPrice),
       description: values.description || undefined,
     });
   }

   return (
     <Form {...form}>
       <form
         onSubmit={form.handleSubmit(onSubmit)}
         className="space-y-4"
       >
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
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 1,500,000"
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(
                      formatNumberWithCommas(event.target.value),
                    )
                  }
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
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 300,000"
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(
                      formatNumberWithCommas(event.target.value),
                    )
                  }
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
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 0.2 for 20%"
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(
                      formatNumberWithCommas(event.target.value),
                    )
                  }
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
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 5,000,000"
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(
                      formatNumberWithCommas(event.target.value),
                    )
                  }
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

         <div className="flex justify-end gap-2 pt-2">
           <Button
             type="button"
             variant="outline"
             size="sm"
             onClick={() => router.back()}
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
   );
 }

