import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  screenerTemplateSchema,
  type ScreenerTemplateFormValues,
} from "@repo/schemas";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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

export const Route = createFileRoute("/_app/screeners/$screenerId")({
  head: () => ({
    meta: [{ title: "Edit Project Screener — Dark Alpha Capital" }],
  }),
  component: EditScreenerPage,
});

function EditScreenerPage() {
  const { screenerId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.screeners.getById.queryOptions({ screenerId }),
  );

  const form = useForm<ScreenerTemplateFormValues>({
    resolver: zodResolver(screenerTemplateSchema),
    values: data
      ? {
          name: data.name,
          category: "Project Screener",
          description: data.description ?? "",
          content: data.content ?? "",
          department: data.department ?? null,
        }
      : undefined,
  });

  const { mutate: updateTemplate, isPending } = useMutation(
    trpc.screeners.updateTemplate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.screeners.getById.queryKey({ screenerId }),
        });
        toast.success("Screener updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update screener");
      },
    }),
  );

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm">
        <Loader2 className="text-primary size-4 animate-spin" />
        <span>Loading screener…</span>
      </div>
    );
  }

  return (
    <section className="block-space-mini container max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 gap-1.5">
        <Link to="/screeners" search={{ department: "" }}>
          <ChevronLeft className="size-4" />
          Back to Screeners
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">{data.name}</h1>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit((values) =>
              updateTemplate({ ...values, screenerId }),
            )(e);
          }}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v === "" ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPARTMENT_VALUES.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Evaluation rubric</FormLabel>
                <FormControl>
                  <Textarea rows={14} className="font-mono text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 size-4" />
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
