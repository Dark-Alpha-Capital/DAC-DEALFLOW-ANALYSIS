
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const THEME_STATUSES = ["ACTIVE", "PAUSED", "RETIRED"] as const;

const ThemeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  sector: z.string().min(1, "Sector is required"),
  status: z.enum(THEME_STATUSES).optional(),
  capitalPriorityScore: z.coerce.number().min(0).max(100).optional(),
  confidenceScore: z.coerce.number().optional(),
});

export type ThemeFormSchemaType = z.infer<typeof ThemeFormSchema>;

export default function AddThemeForm() {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: createTheme, isPending } = useMutation(
    trpc.themes.create.mutationOptions({
      onSuccess: () => {
        toast.success("Theme saved successfully");
        form.reset();
        router.push("/investment-themes");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add theme");
      },
    }),
  );

  const form = useForm<ThemeFormSchemaType>({
    resolver: zodResolver(ThemeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      sector: "",
      status: "ACTIVE",
      capitalPriorityScore: undefined,
      confidenceScore: undefined,
    },
  });

  function onSubmit(values: ThemeFormSchemaType) {
    createTheme(values);
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
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Add Theme"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
