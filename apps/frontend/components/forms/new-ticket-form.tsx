"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TagInput } from "@/components/tag-input";

import { createTicketServerAction } from "@/app/(protected)/tickets/actions";
import { Ticket } from "@/app/types";

// --- Form schema ---
const newTicketFormSchema = z.object({
  title: z.string().min(2).max(50),
  description: z.string().min(10),
  fromName: z.string().min(2).max(50),
  fromEmail: z.string().email(),
  priority: z.number().min(1).max(3),
  tags: z.array(z.string()),
});

// --- Props ---
interface NewTicketFormProps {
  onAddTicket?: (ticket: Ticket) => void;
}

export default function NewTicketForm({ onAddTicket }: NewTicketFormProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof newTicketFormSchema>>({
    resolver: zodResolver(newTicketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      fromName: "",
      fromEmail: "",
      priority: 1,
      tags: [],
    },
  });

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    if (newTags.length > 0) setError((prev) => ({ ...prev, tags: "" }));
  };

  async function onSubmit(values: z.infer<typeof newTicketFormSchema>) {
    startTransition(async () => {
      if (tags.length < 1) {
        setError({ tags: "At least one tag is required" });
        toast.error("At least one tag is required");
        return;
      }

      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("fromName", values.fromName);
      formData.append("fromEmail", values.fromEmail);
      formData.append("priority", values.priority.toString());
      formData.append("tags", JSON.stringify(tags));

      const response = await createTicketServerAction(formData);

      if (!response.success) {
        setError({ content: response.message });
        toast.error(response.message);
        return;
      }

      // --- Add ticket to parent state safely ---
      if (onAddTicket) {
        onAddTicket({
          id: response.ticketId ?? Date.now().toString(),
          title: values.title,
          status: "open",
          priority: values.priority as 1 | 2 | 3, // <-- cast to union
          createdAt: new Date(),
          assignedTo: {
            name: values.fromName,
            email: values.fromEmail || "no-reply@example.com", // ensure string
          },
          tags,
        });
      }

      toast.success(response.message, {
        action: {
          label: "View Ticket",
          onClick: () => router.push(`/tickets/${response.ticketId}`),
        },
      });

      form.reset();
      setTags([]);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Ticket title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fromName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fromEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) =>
                    field.onChange(Number(value) as 1 | 2 | 3) // <-- cast here
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label>Tags</Label>
          <TagInput
            tags={tags}
            setTags={handleTagsChange}
            placeholder="Add tags..."
            maxTags={10}
          />
          {error.tags && <p className="text-red-500 text-sm">{error.tags}</p>}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter ticket description"
                  rows={8}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
