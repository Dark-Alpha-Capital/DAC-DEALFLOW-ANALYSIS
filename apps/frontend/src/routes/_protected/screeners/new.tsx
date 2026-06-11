import { createFileRoute, Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  screenerTemplateSchema,
  type ScreenerTemplateFormValues,
} from "@repo/schemas";
import { DEPARTMENT_VALUES, SCREENER_CATEGORY_VALUES } from "@repo/db/enums";
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
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";

export const Route = createFileRoute("/_protected/screeners/new")({
  head: () => ({
    meta: [{ title: "New Screener — Dark Alpha Capital" }],
  }),
  component: NewScreenerPage,
});

function NewScreenerPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<ScreenerTemplateFormValues>({
    resolver: zodResolver(screenerTemplateSchema),
    defaultValues: {
      name: "",
      category: "Deal Screener",
      description: "",
      content: "",
      department: null,
    },
  });

  const watchedCategory = form.watch("category");

  const { mutate: createTemplate, isPending } = useMutation(
    trpc.screeners.createTemplate.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.screeners.getAll.queryKey(),
        });
        toast.success("Screener created");
        void router.invalidate();
        if (result.screenerId) {
          router.push(`/screeners/${result.screenerId}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create screener");
      },
    }),
  );

  return (
    <section className="block-space-mini container max-w-3xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 gap-1.5">
          <Link to="/screeners">
            <ChevronLeft className="size-4" />
            Back to Screeners
          </Link>
        </Button>
        <h1 className="text-2xl font-bold md:text-3xl">New Screener</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create a new screening template with criteria and questions.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit((values) => createTemplate(values))(e);
          }}
          className="space-y-6"
        >
          <div className="bg-card/40 ring-border/60 space-y-4 rounded-xl p-4 ring-1 sm:p-6">
            <h2 className="text-sm font-semibold">Template details</h2>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Capital Markets Project Screener" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SCREENER_CATEGORY_VALUES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedCategory === "Project Screener" && (
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
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="One or two sentences describing what this screener evaluates."
                      rows={2}
                      {...field}
                    />
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
                  <FormLabel>Screening criteria</FormLabel>
                  <FormControl>
                    <MarkdownEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Write the detailed evaluation criteria, scoring rubric, key questions…"
                      rows={16}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="gap-2">
              <Save className="size-4" />
              {isPending ? "Creating…" : "Create Screener"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/screeners">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
