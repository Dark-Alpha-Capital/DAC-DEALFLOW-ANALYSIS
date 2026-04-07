import * as React from "react";
import type { Control, FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "@/lib/navigation-shim";
import {
  QuickAddDealFormSchema,
  QuickAddDealFormValues,
} from "@/lib/zod-schemas/quick-add-deal-form";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { FieldGroup, FieldLegend, FieldSet, FieldSeparator } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumberWithCommas, unformatNumber } from "@/lib/utils";

function parseNumericField(value?: string | null) {
  if (!value) return undefined;
  const numeric = Number(unformatNumber(value));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function FormattedNumberField({
  control,
  name,
  label,
  placeholder,
  className,
}: {
  control: Control<QuickAddDealFormValues>;
  name: FieldPath<QuickAddDealFormValues>;
  label: React.ReactNode;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={placeholder}
              autoComplete="off"
              value={typeof field.value === "string" ? field.value : ""}
              onChange={(e) =>
                field.onChange(formatNumberWithCommas(e.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export type QuickAddThemeOption = {
  id: string;
  name: string;
  status: string;
};

export type QuickAddDealFormProps = {
  onSuccess?: (data: { dealOpportunityId: string }) => void;
  /** When set (e.g. dialog), Cancel runs this instead of browser back. */
  onCancel?: () => void;
  className?: string;
  /** From `quick-add` route loader; when omitted, themes load via TRPC (e.g. dialog). */
  themes?: QuickAddThemeOption[];
};

const defaultFormValues: QuickAddDealFormValues = {
  dealTeaser: "",
  themeId: "",
  sourceWebsite: "",
  brokerage: "",
  revenue: "",
  ebitda: "",
  ebitdaMargin: "",
  askingPrice: "",
  description: "",
  brokerFirstName: "",
  brokerLastName: "",
  brokerEmail: "",
  brokerPhone: "",
  brokerLinkedIn: "",
};

export function QuickAddDealForm({
  onSuccess,
  onCancel,
  className,
  themes: themesFromLoader,
}: QuickAddDealFormProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: themesFromQuery = [], isLoading: themesQueryLoading } =
    useQuery({
      ...trpc.themes.listForSelect.queryOptions(),
      enabled: themesFromLoader === undefined,
    });

  const themeOptions = themesFromLoader ?? themesFromQuery;
  const themesLoading = themesFromLoader === undefined && themesQueryLoading;

  const form = useForm<QuickAddDealFormValues>({
    resolver: zodResolver(QuickAddDealFormSchema),
    defaultValues: defaultFormValues,
  });

  const { mutate: createQuick, isPending } = useMutation(
    trpc.dealOpportunities.createOpportunityQuick.mutationOptions({
      onSuccess: (data) => {
        toast.success("Deal opportunity created");
        form.reset(defaultFormValues);
        void router.invalidate();
        if (onSuccess) {
          onSuccess(data);
        } else {
          router.push(`/deal-opportunities/${data.dealOpportunityId}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add deal");
      },
    }),
  );

  function onSubmit(values: QuickAddDealFormValues) {
    createQuick({
      dealTeaser: values.dealTeaser,
      themeId: values.themeId || undefined,
      sourceWebsite: values.sourceWebsite || undefined,
      brokerage: values.brokerage || undefined,
      revenue: parseNumericField(values.revenue),
      ebitda: parseNumericField(values.ebitda),
      ebitdaMargin: parseNumericField(values.ebitdaMargin),
      askingPrice: parseNumericField(values.askingPrice),
      description: values.description || undefined,
      brokerFirstName: values.brokerFirstName || undefined,
      brokerLastName: values.brokerLastName || undefined,
      brokerEmail: values.brokerEmail || undefined,
      brokerPhone: values.brokerPhone || undefined,
      brokerLinkedIn: values.brokerLinkedIn || undefined,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={className ?? "space-y-6"}
      >
        <FieldSet>
          <FieldLegend>Deal listing</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="dealTeaser"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Deal title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Manufacturing Co — $5M revenue"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="themeId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Opportunity theme</FormLabel>
                  <Select
                    disabled={themesLoading}
                    value={field.value ? field.value : "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            themesLoading
                              ? "Loading themes..."
                              : "Select a theme (optional)"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No theme</SelectItem>
                      {themeOptions.map((theme) => (
                        <SelectItem key={theme.id} value={theme.id}>
                          {`${theme.name} (${theme.status})`}
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
            <FormattedNumberField
              control={form.control}
              name="revenue"
              label="Listing revenue"
              placeholder="e.g., 1,500,000"
            />
            <FormattedNumberField
              control={form.control}
              name="ebitda"
              label="Listing EBITDA"
              placeholder="e.g., 300,000"
            />
            <FormattedNumberField
              control={form.control}
              name="ebitdaMargin"
              label="Listing EBITDA margin (0-1)"
              placeholder="e.g., 0.2"
            />
            <FormattedNumberField
              control={form.control}
              name="askingPrice"
              label="Asking price"
              placeholder="e.g., 5,000,000"
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
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
          </FieldGroup>

          <FieldSeparator>Broker contact</FieldSeparator>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <FormField
                  control={form.control}
                  name="brokerFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brokerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>
          <FormField
            control={form.control}
            name="brokerLinkedIn"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FieldSet>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => (onCancel ? onCancel() : router.back())}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Creating..." : "Create deal opportunity"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
