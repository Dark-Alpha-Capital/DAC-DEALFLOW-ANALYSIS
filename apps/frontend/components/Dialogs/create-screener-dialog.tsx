
import { useState } from "react";
import { useRouter } from "@/lib/navigation-shim";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const createScreenerTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

type CreateScreenerTemplateValues = z.infer<typeof createScreenerTemplateSchema>;

export default function AddScreenerDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreateScreenerTemplateValues>({
    resolver: zodResolver(createScreenerTemplateSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
    },
  });

  const { mutate: createTemplate, isPending } = useMutation(
    trpc.screeners.createTemplate.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.screeners.getAll.queryKey(),
        });
        toast.success("Screener template created");
        form.reset();
        setOpen(false);
        router.refresh();

        if (result.screenerId) {
          router.push(`/screeners/${result.screenerId}`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create screener template");
      },
    }),
  );

  function onSubmit(values: CreateScreenerTemplateValues) {
    createTemplate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 size-4" />
          Add Screener
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Screener Template</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Financial Quality Screener" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Financial / Market / Management" {...field} />
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
                      placeholder="What this screener is designed to assess."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Template"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
