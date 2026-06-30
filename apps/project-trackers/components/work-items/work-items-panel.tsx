import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { TagsInput } from "@/components/ui/tags-input";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";
import {
  formatWorkItemDate,
  workItemStatusDotClass,
  workItemStatusLabel,
  workItemPriorityLabel,
  workItemPriorityColor,
} from "@/lib/work-item-display";
import { cn } from "@/lib/utils";
import {
  WORK_ITEM_STATUS_VALUES,
  WORK_ITEM_PRIORITY_VALUES,
  type WorkItemStatusValue,
  type WorkItemPriorityValue,
} from "@repo/enums";
import { createWorkItemSchema } from "@repo/schemas";
import {
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Minus,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Table2,
  MessageSquare,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { CommentsPanel } from "@/components/comments/comments-panel";
import { WorkLogsPanel } from "@/components/work-logs/work-logs-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewSelector } from "@/components/views/view-selector";
import { BoardView } from "@/components/views/board-view";
import type { ViewTypeValue } from "@repo/enums";

type WorkItemRecord = {
  id: string;
  trackerId: string;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  priority: WorkItemPriorityValue;
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  tags: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type WorkItemFormValues = {
  trackerId: string;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  priority: WorkItemPriorityValue;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  tags: string[];
};

const STATUS_GROUP_ORDER: WorkItemStatusValue[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

function StatusCircle({
  status,
  className,
}: {
  status: WorkItemStatusValue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-3.5 shrink-0 rounded-full",
        workItemStatusDotClass(status),
        className,
      )}
    />
  );
}

function PriorityIcon({
  priority,
  className,
}: {
  priority: WorkItemPriorityValue;
  className?: string;
}) {
  const cls = cn("size-3.5 shrink-0", workItemPriorityColor(priority), className);
  switch (priority) {
    case "URGENT":
      return <AlertCircle className={cls} />;
    case "HIGH":
      return <ArrowUp className={cls} />;
    case "MEDIUM":
      return <ArrowRight className={cls} />;
    case "LOW":
      return <ArrowDown className={cls} />;
    case "NONE":
      return <Minus className={cls} />;
  }
}

function StatusPill({
  value,
  onChange,
}: {
  value: WorkItemStatusValue;
  onChange: (v: WorkItemStatusValue) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-normal"
        >
          <StatusCircle status={value} />
          {workItemStatusLabel(value)}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {WORK_ITEM_STATUS_VALUES.map((s) => (
          <DropdownMenuItem key={s} onClick={() => onChange(s)}>
            <StatusCircle status={s} className="mr-2" />
            {workItemStatusLabel(s)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityPill({
  value,
  onChange,
}: {
  value: WorkItemPriorityValue;
  onChange: (v: WorkItemPriorityValue) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-normal"
        >
          <PriorityIcon priority={value} />
          {workItemPriorityLabel(value)}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {WORK_ITEM_PRIORITY_VALUES.map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)}>
            <PriorityIcon priority={p} className="mr-2" />
            {workItemPriorityLabel(p)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DatePill({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (v: Date | null) => void;
}) {
  function toDateInputValue(date: Date | null): string {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDateInput(val: string): Date | null {
    if (!val) return null;
    const parsed = new Date(`${val}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return (
    <span className="relative inline-flex h-7 cursor-pointer select-none items-center rounded-full border border-input bg-background px-2.5 text-xs hover:bg-accent">
      {value ? formatWorkItemDate(value) : label}
      <input
        type="date"
        className="absolute inset-0 w-full cursor-pointer opacity-0"
        value={toDateInputValue(value)}
        onChange={(e) => onChange(parseDateInput(e.target.value))}
      />
    </span>
  );
}

function WorkItemFormDrawer({
  open,
  onOpenChange,
  trackerId,
  workItem,
  epics,
  cycles,
  modules,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  workItem?: WorkItemRecord | null;
  epics: { id: string; title: string }[];
  cycles: { id: string; name: string }[];
  modules: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const isEditing = workItem != null;

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(createWorkItemSchema),
    defaultValues: {
      trackerId,
      title: workItem?.title ?? "",
      description: workItem?.description ?? "",
      status: workItem?.status ?? "TODO",
      priority: workItem?.priority ?? "NONE",
      epicId: workItem?.epicId ?? null,
      cycleId: workItem?.cycleId ?? null,
      moduleId: workItem?.moduleId ?? null,
      startDate: workItem?.startDate ?? null,
      dueDate: workItem?.dueDate ?? null,
      estimatePoints: workItem?.estimatePoints ?? null,
      estimateHours: workItem?.estimateHours ?? null,
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
      onError: (error) => toast.error(error.message || "Failed to create work item"),
    }),
  );

  const { mutate: updateItem, isPending: isUpdating } = useMutation(
    trpc.workItems.update.mutationOptions({
      onSuccess: () => {
        toast.success("Work item updated");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message || "Failed to update work item"),
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: WorkItemFormValues) {
    if (isEditing && workItem) {
      updateItem({
        workItemId: workItem.id,
        title: values.title,
        description: values.description ?? "",
        status: values.status,
        priority: values.priority,
        epicId: values.epicId ?? null,
        cycleId: values.cycleId ?? null,
        moduleId: values.moduleId ?? null,
        startDate: values.startDate ?? null,
        dueDate: values.dueDate ?? null,
        tags: values.tags ?? [],
      });
    } else {
      createItem({
        trackerId,
        title: values.title,
        description: values.description ?? "",
        status: values.status,
        priority: values.priority,
        epicId: values.epicId ?? null,
        cycleId: values.cycleId ?? null,
        moduleId: values.moduleId ?? null,
        startDate: values.startDate ?? null,
        dueDate: values.dueDate ?? null,
        estimatePoints: values.estimatePoints ?? null,
        estimateHours: values.estimateHours ?? null,
        tags: values.tags ?? [],
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{isEditing ? "Edit work item" : "New work item"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        placeholder="Work item title"
                        className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/60 focus:outline-none"
                        {...field}
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
                    <FormControl>
                      <MarkdownEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        rows={12}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TagsInput
                        value={field.value ?? []}
                        onTagsChange={field.onChange}
                        maxTags={32}
                        placeholder="Add tags and press Enter…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Plane-style bottom pill bar */}
            <div className="shrink-0 border-t px-6 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <StatusPill value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <PriorityPill value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <DatePill
                        label="Start date"
                        value={field.value instanceof Date ? field.value : null}
                        onChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <DatePill
                        label="Due date"
                        value={field.value instanceof Date ? field.value : null}
                        onChange={field.onChange}
                      />
                    </FormItem>
                  )}
                />
                {epics.length > 0 && (
                  <FormField
                    control={form.control}
                    name="epicId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 rounded-full px-2.5 text-xs font-normal"
                            >
                              {field.value
                                ? (epics.find((e) => e.id === field.value)?.title ?? "Epic")
                                : "Epic"}
                              <ChevronDown className="size-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => field.onChange(null)}>
                              None
                            </DropdownMenuItem>
                            {epics.map((e) => (
                              <DropdownMenuItem
                                key={e.id}
                                onClick={() => field.onChange(e.id)}
                              >
                                {e.title}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </FormItem>
                    )}
                  />
                )}
                {cycles.length > 0 && (
                  <FormField
                    control={form.control}
                    name="cycleId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 rounded-full px-2.5 text-xs font-normal"
                            >
                              {field.value
                                ? (cycles.find((c) => c.id === field.value)?.name ?? "Cycle")
                                : "Cycle"}
                              <ChevronDown className="size-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => field.onChange(null)}>
                              None
                            </DropdownMenuItem>
                            {cycles.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onClick={() => field.onChange(c.id)}
                              >
                                {c.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </FormItem>
                    )}
                  />
                )}
                {modules.length > 0 && (
                  <FormField
                    control={form.control}
                    name="moduleId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 rounded-full px-2.5 text-xs font-normal"
                            >
                              {field.value
                                ? (modules.find((m) => m.id === field.value)?.name ?? "Module")
                                : "Module"}
                              <ChevronDown className="size-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => field.onChange(null)}>
                              None
                            </DropdownMenuItem>
                            {modules.map((m) => (
                              <DropdownMenuItem
                                key={m.id}
                                onClick={() => field.onChange(m.id)}
                              >
                                {m.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Saving…" : isEditing ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function GroupedListView({
  items,
  onEdit,
  onDelete,
  onExpand,
}: {
  items: WorkItemRecord[];
  onEdit: (item: WorkItemRecord) => void;
  onDelete: (item: WorkItemRecord) => void;
  onExpand: (item: WorkItemRecord) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<WorkItemStatusValue>>(new Set());

  const groups = STATUS_GROUP_ORDER.map((status) => ({
    status,
    items: items.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No work items yet.</p>
      </div>
    );
  }

  function toggleGroup(status: WorkItemStatusValue) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  return (
    <div className="space-y-0.5">
      {groups.map(({ status, items: groupItems }) => {
        const isCollapsed = collapsed.has(status);
        return (
          <div key={status}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50"
              onClick={() => toggleGroup(status)}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              )}
              <StatusCircle status={status} />
              <span className="font-medium">{workItemStatusLabel(status)}</span>
              <span className="text-xs text-muted-foreground">{groupItems.length}</span>
            </button>
            {!isCollapsed && (
              <div>
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40"
                    onClick={() => onExpand(item)}
                  >
                    <span className="w-5 shrink-0" />
                    <StatusCircle status={item.status} />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          workItemPriorityColor(item.priority),
                        )}
                      >
                        <PriorityIcon priority={item.priority} />
                        <span className="hidden lg:inline">
                          {workItemPriorityLabel(item.priority)}
                        </span>
                      </span>
                      {item.dueDate && (
                        <span
                          className={cn(
                            "text-muted-foreground",
                            item.dueDate < new Date() && "text-red-500",
                          )}
                        >
                          {formatWorkItemDate(item.dueDate)}
                        </span>
                      )}
                      {item.tags.length > 0 && (
                        <div className="hidden items-center gap-1 sm:flex">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="rounded-full px-1.5 text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableView({
  items,
  onEdit,
  onDelete,
  onExpand,
}: {
  items: WorkItemRecord[];
  onEdit: (item: WorkItemRecord) => void;
  onDelete: (item: WorkItemRecord) => void;
  onExpand: (item: WorkItemRecord) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No work items yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Title
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              State
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Priority
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Start date
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Due date
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Tags
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
              Updated
            </th>
            <th className="w-16 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="group cursor-pointer border-b last:border-0 hover:bg-accent/30"
              onClick={() => onExpand(item)}
            >
              <td className="px-4 py-2.5 font-medium">{item.title}</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-1.5">
                  <StatusCircle status={item.status} />
                  <span className="text-xs text-muted-foreground">
                    {workItemStatusLabel(item.status)}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    workItemPriorityColor(item.priority),
                  )}
                >
                  <PriorityIcon priority={item.priority} />
                  {workItemPriorityLabel(item.priority)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {formatWorkItemDate(item.startDate)}
              </td>
              <td className="px-3 py-2.5 text-xs">
                <span
                  className={
                    item.dueDate && item.dueDate < new Date()
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }
                >
                  {formatWorkItemDate(item.dueDate)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full px-1.5 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {formatWorkItemDate(item.updatedAt)}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkItemDetailSheet({
  workItem,
  open,
  onOpenChange,
}: {
  workItem: WorkItemRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!workItem) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            <StatusCircle status={workItem.status} />
            <PriorityIcon priority={workItem.priority} />
            <SheetTitle className="text-base">{workItem.title}</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {workItem.createdAt.toLocaleDateString()} ·{" "}
            {workItemStatusLabel(workItem.status)}
          </p>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs defaultValue="comments" className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="comments" className="flex-1">
                <MessageSquare className="mr-1.5 size-3.5" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="time" className="flex-1">
                <Clock className="mr-1.5 size-3.5" />
                Time
              </TabsTrigger>
              <TabsTrigger value="details" className="flex-1">
                Details
              </TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4 pb-6">
              <CommentsPanel workItemId={workItem.id} />
            </TabsContent>
            <TabsContent value="time" className="mt-4 pb-6">
              <WorkLogsPanel workItemId={workItem.id} />
            </TabsContent>
            <TabsContent value="details" className="mt-4 pb-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    workItemPriorityColor(workItem.priority),
                  )}
                >
                  <PriorityIcon priority={workItem.priority} />
                  {workItemPriorityLabel(workItem.priority)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start date</span>
                <span>{formatWorkItemDate(workItem.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span
                  className={
                    workItem.dueDate && workItem.dueDate < new Date()
                      ? "text-red-500"
                      : ""
                  }
                >
                  {formatWorkItemDate(workItem.dueDate)}
                </span>
              </div>
              {workItem.estimatePoints != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-medium">{workItem.estimatePoints} pts</span>
                </div>
              )}
              {workItem.estimateHours != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-medium">{workItem.estimateHours}h</span>
                </div>
              )}
              {workItem.tags.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tags</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {workItem.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full px-1.5 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {workItem.description.trim() && (
                <div>
                  <p className="mb-1 font-medium text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap">{workItem.description}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function WorkItemsPanel({ trackerId }: { trackerId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItemRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<WorkItemRecord | null>(null);
  const [expandedItem, setExpandedItem] = useState<WorkItemRecord | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const [activeView, setActiveView] = useState<{
    type: ViewTypeValue;
    filters: Record<string, unknown>;
  }>({ type: "list", filters: {} });

  const itemsQuery = trpc.workItems.listByTracker.queryOptions({ trackerId });
  const { data: items = [], isLoading } = useQuery(itemsQuery);
  const { data: epicsData = [] } = useQuery(
    trpc.epics.listByTracker.queryOptions({ trackerId }),
  );
  const { data: cyclesData = [] } = useQuery(
    trpc.cycles.listByTracker.queryOptions({ trackerId }),
  );
  const { data: modulesData = [] } = useQuery(
    trpc.modules.listByTracker.queryOptions({ trackerId }),
  );

  const invalidate = () => {
    void queryClient.invalidateQueries(itemsQuery);
  };

  const { mutate: deleteItem, isPending: isDeleting } = useMutation(
    trpc.workItems.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Work item deleted");
        setDeletingItem(null);
        invalidate();
      },
      onError: (error) => toast.error(error.message || "Failed"),
    }),
  );

  const isBoard = activeView.type === "board";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Work items</h2>
          <p className="text-xs text-muted-foreground">
            Track tasks, deliverables, and action items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isBoard && (
            <div className="flex items-center gap-0.5 rounded-md border p-0.5">
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="size-6"
                title="List view"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="size-6"
                title="Table view"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="size-3.5" />
              </Button>
            </div>
          )}
          <ViewSelector
            trackerId={trackerId}
            activeView={activeView}
            onViewChange={setActiveView}
          />
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : isBoard ? (
        <BoardView
          trackerId={trackerId}
          items={items}
          onItemClick={(item) => setExpandedItem(item)}
        />
      ) : viewMode === "table" ? (
        <TableView
          items={items}
          onEdit={(item) => {
            setEditingItem(item);
            setFormOpen(true);
          }}
          onDelete={setDeletingItem}
          onExpand={setExpandedItem}
        />
      ) : (
        <GroupedListView
          items={items}
          onEdit={(item) => {
            setEditingItem(item);
            setFormOpen(true);
          }}
          onDelete={setDeletingItem}
          onExpand={setExpandedItem}
        />
      )}

      <WorkItemFormDrawer
        key={editingItem?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        trackerId={trackerId}
        workItem={editingItem}
        epics={epicsData}
        cycles={cyclesData}
        modules={modulesData}
        onSuccess={invalidate}
      />
      <WorkItemDetailSheet
        workItem={expandedItem}
        open={expandedItem != null}
        onOpenChange={(o) => !o && setExpandedItem(null)}
      />
      <AlertDialog
        open={deletingItem != null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingItem?.title}".
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
