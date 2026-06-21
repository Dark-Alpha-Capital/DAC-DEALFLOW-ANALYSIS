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

const projectScreenerSchema = screenerTemplateSchema.extend({
  category: screenerTemplateSchema.shape.category.refine(
    (v) => v === "Project Screener",
    "Must be Project Screener",
  ),
});

export const Route = createFileRoute("/_app/screeners/new")({
  head: () => ({
    meta: [{ title: "New Project Screener — Dark Alpha Capital" }],
  }),
  component: NewScreenerPage,
});

function NewScreenerPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<ScreenerTemplateFormValues>({
    resolver: zodResolver(projectScreenerSchema),
    defaultValues: {
      name: "",
      category: "Project Screener",
      description: "",
      content: "",
      department: null,
    },
  });

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
          <Link to="/screeners" search={{ department: "" }}>
            <ChevronLeft className="size-4" />
            Back to Screeners
          </Link>
        </Button>
        <h1 className="text-2xl font-bold md:text-3xl">New Project Screener</h1>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit((values) => createTemplate(values))(e);
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
                  <Input placeholder="Technology Project Screener" {...field} />
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
                  <Textarea rows={12} className="font-mono text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 size-4" />
            {isPending ? "Saving…" : "Create screener"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
