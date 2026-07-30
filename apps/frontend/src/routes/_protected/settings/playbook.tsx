import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
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

const playbookSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  summaryMd: z.string().trim().default(""),
  leversText: z.string().trim().min(1, "Add at least one lever"),
});

export const Route = createFileRoute("/_protected/settings/playbook")({
  head: () => ({
    meta: [{ title: "Playbook — Dark Alpha Capital" }],
  }),
  component: PlaybookSettingsRoute,
});

function PlaybookSettingsRoute() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const playbookQuery = useQuery(trpc.organizationSettings.getPlaybook.queryOptions());

  const form = useForm<z.infer<typeof playbookSchema>>({
    resolver: zodResolver(playbookSchema),
    defaultValues: {
      title: "",
      summaryMd: "",
      leversText: "",
    },
  });

  useEffect(() => {
    if (playbookQuery.data) {
      form.reset({
        title: playbookQuery.data.title,
        summaryMd: playbookQuery.data.summaryMd ?? "",
        leversText: playbookQuery.data.levers
          .map((lever) =>
            lever.descriptionMd
              ? `${lever.name}|${lever.descriptionMd}`
              : lever.name,
          )
          .join("\n"),
      });
    }
  }, [form, playbookQuery.data]);

  const mutation = useMutation(
    trpc.organizationSettings.updatePlaybook.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.organizationSettings.getPlaybook.queryKey(),
        });
        toast.success("Playbook updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Value Creation Playbook</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Capture the levers your team uses when underwriting and improving assets.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit((values) =>
              mutation.mutate({
                title: values.title,
                summaryMd: values.summaryMd || null,
                levers: values.leversText
                  .split("\n")
                  .map((entry) => entry.trim())
                  .filter(Boolean)
                  .map((entry) => {
                    const [name, descriptionMd = ""] = entry.split("|");
                    return {
                      name: name?.trim() || "",
                      descriptionMd: descriptionMd.trim() || null,
                    };
                  }),
              }),
            )(event);
          }}
          className="space-y-4 rounded-xl border p-6"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Playbook title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="summaryMd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leversText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Levers</FormLabel>
                <FormControl>
                  <Textarea
                    rows={10}
                    {...field}
                    placeholder="Pricing|Pricing power and packaging&#10;Bolt-ons|Adjacency M&A and integration readiness"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save playbook"}
          </Button>
        </form>
      </Form>
    </section>
  );
}
