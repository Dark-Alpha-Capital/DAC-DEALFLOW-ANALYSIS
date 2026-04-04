
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
import { Textarea } from "@/components/ui/textarea";
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
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
import type { Theme } from "@repo/db";
import {
  ThemeFormSchema,
  type ThemeFormSchemaType,
} from "@/lib/zod-schemas/theme-forms";
import { THEME_STATUSES } from "@/lib/zod-schemas/shared-form-enums";

export type { ThemeFormSchemaType };

export default function EditThemeForm({ theme }: { theme: Theme }) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: updateTheme, isPending } = useMutation(
    trpc.themes.update.mutationOptions({
      onSuccess: () => {
        toast.success("Theme updated successfully");
        void router.invalidate();
        router.push(`/investment-themes/${theme.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update theme");
      },
    }),
  );

  const form = useForm<ThemeFormSchemaType>({
    resolver: zodResolver(ThemeFormSchema),
    defaultValues: {
      name: theme.name,
      description: theme.description,
      sector: theme.sector,
      status: theme.status,
      capitalPriorityScore: theme.capitalPriorityScore ?? undefined,
      confidenceScore: theme.confidenceScore ?? undefined,
    },
  });

  function onSubmit(values: ThemeFormSchemaType) {
    updateTheme({ ...values, id: theme.id });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Theme Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Healthcare Tech" {...field} />
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
                  <FormLabel>Sector *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Healthcare, Manufacturing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {THEME_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
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
              name="capitalPriorityScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capital Priority Score (0–100)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g., 75"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confidenceScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence Score</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 80" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Theme description..."
                      className="min-h-[100px]"
                      {...field}
                    />
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
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Update Theme"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
