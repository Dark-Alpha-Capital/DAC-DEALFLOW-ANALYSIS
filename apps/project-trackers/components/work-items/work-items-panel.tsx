import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { TagsInput } from "@/components/ui/tags-input";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";
import {
  formatWorkItemDate,
  workItemStatusBadgeClass,
  workItemStatusLabel,
} from "@/lib/work-item-display";
import { cn } from "@/lib/utils";
import { WORK_ITEM_STATUS_VALUES, type WorkItemStatusValue } from "@repo/enums";
import {
  createWorkItemSchema,
} from "@repo/schemas";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type WorkItemFormValues = {
  trackerId: string;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  startDate: Date | null;
  dueDate: Date | null;
  tags: string[];
};

const workItemFormSchema = createWorkItemSchema;

type WorkItemRecord = {
  id: string;
  trackerId: string;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  startDate: Date | null;
  dueDate: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function WorkItemFormDialog({
  open,
  onOpenChange,
  trackerId,
  workItem,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  workItem?: WorkItemRecord | null;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const isEditing = workItem != null;

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      trackerId,
      title: workItem?.title ?? "",
      description: workItem?.description ?? "",
      status: workItem?.status ?? "TODO",
      startDate: workItem?.startDate ?? null,
      dueDate: workItem?.dueDate ?? null,
      tags: workItem?.tags ?? [],
    },
  });

  const { mutate: createItem, isPending: isCreating } = useMutation(
    trpc.workItems.create.mutationOptions({
      onSuccess: () => {
        toast.success("Work item created");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create work item");
      },
    }),
  );

  const { mutate: updateItem, isPending: isUpdating } = useMutation(
    trpc.workItems.update.mutationOptions({
      onSuccess: () => {
        toast.success("Work item updated");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update work item");
      },
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: WorkItemFormValues) {
    const payload = {
      title: values.title,
      description: values.description ?? "",
      status: values.status,
      startDate: values.startDate ?? null,
      dueDate: values.dueDate ?? null,
      tags: values.tags ?? [],
    };

    if (isEditing && workItem) {
      updateItem({ workItemId: workItem.id, ...payload });
    } else {
      createItem({ trackerId, ...payload });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit work item" : "New work item"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Work item title" {...field} />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WORK_ITEM_STATUS_VALUES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {workItemStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInputValue(
                          field.value instanceof Date ? field.value : null,
                        )}
                        onChange={(e) =>
                          field.onChange(parseDateInput(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInputValue(
                          field.value instanceof Date ? field.value : null,
                        )}
                        onChange={(e) =>
                          field.onChange(parseDateInput(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagsInput
                      value={field.value ?? []}
                      onTagsChange={field.onChange}
                      maxTags={32}
                      placeholder="Add a tag and press Enter…"
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
                    <MarkdownEditor
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      rows={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Create work item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function WorkItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: WorkItemRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card/40 ring-border/60 rounded-xl p-4 ring-1">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-foreground font-medium">{item.title}</h3>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              workItemStatusBadgeClass(item.status),
            )}
          >
            {workItemStatusLabel(item.status)}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
            aria-label="Edit work item"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
            onClick={onDelete}
            aria-label="Delete work item"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {item.tags.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>Start: {formatWorkItemDate(item.startDate)}</span>
        <span>Due: {formatWorkItemDate(item.dueDate)}</span>
      </div>

      {item.description.trim() ? (
        <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-wrap">
          {item.description.replace(/!\[[^\]]*\]\([^)]+\)/g, "[image]")}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm italic">No description</p>
      )}
    </div>
  );
}

export function WorkItemsPanel({ trackerId }: { trackerId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItemRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<WorkItemRecord | null>(null);

  const listQuery = trpc.workItems.listByTracker.queryOptions({ trackerId });
  const { data: items = [], isLoading } = useQuery(listQuery);

  const invalidate = () => {
    void queryClient.invalidateQueries(listQuery);
  };

  const { mutate: deleteItem, isPending: isDeleting } = useMutation(
    trpc.workItems.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Work item deleted");
        setDeletingItem(null);
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete work item");
      },
    }),
  );

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: WorkItemRecord) {
    setEditingItem(item);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Work items</h2>
          <p className="text-muted-foreground text-xs">
            Track tasks, deliverables, and action items for this project.
          </p>
        </div>
        <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          Add work item
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading work items…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card/40 ring-border/60 rounded-xl p-8 text-center ring-1">
          <p className="text-muted-foreground text-sm">No work items yet.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Create first work item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <WorkItemCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeletingItem(item)}
            />
          ))}
        </div>
      )}

      <WorkItemFormDialog
        key={editingItem?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        trackerId={trackerId}
        workItem={editingItem}
        onSuccess={invalidate}
      />

      <AlertDialog
        open={deletingItem != null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deletingItem?.title}&rdquo;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() =>
                deletingItem && deleteItem({ workItemId: deletingItem.id })
              }
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
