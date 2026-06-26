import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
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
import { createWorkItemSchema } from "@repo/schemas";
import { Loader2, Pencil, Plus, Trash2, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { CommentsPanel } from "@/components/comments/comments-panel";
import { WorkLogsPanel } from "@/components/work-logs/work-logs-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewSelector } from "@/components/views/view-selector";
import { BoardView } from "@/components/views/board-view";
import type { ViewTypeValue } from "@repo/enums";

type WorkItemFormValues = {
  trackerId: string;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  tags: string[];
};

const workItemFormSchema = createWorkItemSchema;

type WorkItemRecord = {
  id: string;
  trackerId: string;
  epicId: string | null;
  cycleId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  status: WorkItemStatusValue;
  startDate: Date | null;
  dueDate: Date | null;
  estimatePoints: number | null;
  estimateHours: number | null;
  tags: string[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const ESTIMATE_POINTS = ["1", "2", "3", "5", "8", "13", "21"] as const;

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

function EstimateSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Select
      value={value != null ? String(value) : "none"}
      onValueChange={(v) => onChange(v === "none" ? null : Number(v))}
    >
      <FormControl>
        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
      </FormControl>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {ESTIMATE_POINTS.map((p) => (
          <SelectItem key={p} value={p}>{p} pts</SelectItem>
        ))}
      </SelectContent>
    </Select>
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
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      trackerId,
      title: workItem?.title ?? "",
      description: workItem?.description ?? "",
      status: workItem?.status ?? "TODO",
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
      onSuccess: () => { toast.success("Work item created"); onSuccess(); onOpenChange(false); },
      onError: (error) => toast.error(error.message || "Failed to create work item"),
    }),
  );

  const { mutate: updateItem, isPending: isUpdating } = useMutation(
    trpc.workItems.update.mutationOptions({
      onSuccess: () => { toast.success("Work item updated"); onSuccess(); onOpenChange(false); },
      onError: (error) => toast.error(error.message || "Failed to update work item"),
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: WorkItemFormValues) {
    const payload = {
      title: values.title,
      description: values.description ?? "",
      status: values.status,
      epicId: values.epicId ?? null,
      cycleId: values.cycleId ?? null,
      moduleId: values.moduleId ?? null,
      startDate: values.startDate ?? null,
      dueDate: values.dueDate ?? null,
      estimatePoints: values.estimatePoints ?? null,
      estimateHours: values.estimateHours ?? null,
      tags: values.tags ?? [],
    };

    if (isEditing && workItem) {
      updateItem({ workItemId: workItem.id, ...payload });
    } else {
      createItem({ trackerId, ...payload });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-5 text-left">
          <SheetTitle>{isEditing ? "Edit work item" : "New work item"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Work item title" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{WORK_ITEM_STATUS_VALUES.map((s) => (<SelectItem key={s} value={s}>{workItemStatusLabel(s)}</SelectItem>))}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="epicId" render={({ field }) => (
                  <FormItem><FormLabel>Epic</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {epics.map((e) => (<SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>))}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cycleId" render={({ field }) => (
                  <FormItem><FormLabel>Cycle</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {cycles.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="moduleId" render={({ field }) => (
                  <FormItem><FormLabel>Module</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {modules.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>Start date</FormLabel><FormControl>
                    <Input type="date" value={toDateInputValue(field.value instanceof Date ? field.value : null)} onChange={(e) => field.onChange(parseDateInput(e.target.value))} />
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>Due date</FormLabel><FormControl>
                    <Input type="date" value={toDateInputValue(field.value instanceof Date ? field.value : null)} onChange={(e) => field.onChange(parseDateInput(e.target.value))} />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="estimatePoints" render={({ field }) => (
                  <FormItem><FormLabel>Points (estimate)</FormLabel><EstimateSelect value={field.value} onChange={field.onChange} /><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="estimateHours" render={({ field }) => (
                  <FormItem><FormLabel>Hours (estimate)</FormLabel><FormControl>
                    <Input type="number" min="0" step="0.5" placeholder="e.g., 4" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Tags</FormLabel><FormControl>
                  <TagsInput value={field.value ?? []} onTagsChange={field.onChange} maxTags={32} placeholder="Add a tag and press Enter…" />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl>
                  <MarkdownEditor value={field.value ?? ""} onChange={field.onChange} rows={12} />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : isEditing ? "Save changes" : "Create work item"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function WorkItemCard({
  item,
  onEdit,
  onDelete,
  onExpand,
}: {
  item: WorkItemRecord;
  onEdit: () => void;
  onDelete: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="bg-card/40 ring-border/60 rounded-xl p-4 ring-1 cursor-pointer" onClick={onExpand}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-foreground font-medium">{item.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", workItemStatusBadgeClass(item.status))}>
              {workItemStatusLabel(item.status)}
            </span>
            {item.estimatePoints != null && (
              <Badge variant="secondary" className="text-xs">{item.estimatePoints} pts</Badge>
            )}
            {item.estimateHours != null && (
              <Badge variant="secondary" className="text-xs">{item.estimateHours}h</Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive size-8" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      {item.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (<Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>))}
        </div>
      )}
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>Start: {formatWorkItemDate(item.startDate)}</span>
        <span>Due: {formatWorkItemDate(item.dueDate)}</span>
        <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1"><MessageSquare className="size-3" />Discuss</span>
        <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1"><Clock className="size-3" />Log time</span>
      </div>
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
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle className="text-base">{workItem.title}</SheetTitle>
          <p className="text-muted-foreground text-xs">
            Created {workItem.createdAt.toLocaleDateString()} • Status: {workItemStatusLabel(workItem.status)}
          </p>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs defaultValue="comments" className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="comments" className="flex-1">Comments</TabsTrigger>
              <TabsTrigger value="time" className="flex-1">Time tracking</TabsTrigger>
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4 pb-6">
              <CommentsPanel workItemId={workItem.id} />
            </TabsContent>
            <TabsContent value="time" className="mt-4 pb-6">
              <WorkLogsPanel workItemId={workItem.id} />
            </TabsContent>
            <TabsContent value="details" className="mt-4 pb-6">
              <div className="space-y-3 text-sm">
                {workItem.estimatePoints != null && <div className="flex justify-between"><span className="text-muted-foreground">Points</span><span className="font-medium">{workItem.estimatePoints} pts</span></div>}
                {workItem.estimateHours != null && <div className="flex justify-between"><span className="text-muted-foreground">Hours</span><span className="font-medium">{workItem.estimateHours}h</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Start date</span><span>{formatWorkItemDate(workItem.startDate)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due date</span><span>{formatWorkItemDate(workItem.dueDate)}</span></div>
                {workItem.description.trim() && (
                  <div><p className="text-muted-foreground mb-1 font-medium">Description</p><p className="whitespace-pre-wrap">{workItem.description}</p></div>
                )}
              </div>
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
  const [activeView, setActiveView] = useState<{ type: ViewTypeValue; filters: Record<string, unknown> }>({ type: "list", filters: {} });

  const itemsQuery = trpc.workItems.listByTracker.queryOptions({ trackerId });
  const { data: items = [], isLoading } = useQuery(itemsQuery);

  const { data: epicsData = [] } = useQuery(trpc.epics.listByTracker.queryOptions({ trackerId }));
  const { data: cyclesData = [] } = useQuery(trpc.cycles.listByTracker.queryOptions({ trackerId }));
  const { data: modulesData = [] } = useQuery(trpc.modules.listByTracker.queryOptions({ trackerId }));

  const invalidate = () => { void queryClient.invalidateQueries(itemsQuery); };

  const { mutate: deleteItem, isPending: isDeleting } = useMutation(
    trpc.workItems.delete.mutationOptions({
      onSuccess: () => { toast.success("Work item deleted"); setDeletingItem(null); invalidate(); },
      onError: (error) => toast.error(error.message || "Failed"),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Work items</h2>
          <p className="text-muted-foreground text-xs">Track tasks, deliverables, and action items.</p>
        </div>
        <ViewSelector trackerId={trackerId} activeView={activeView} onViewChange={setActiveView} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" className="gap-1.5" onClick={() => { setEditingItem(null); setFormOpen(true); }}>
          <Plus className="size-4" />Add work item
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm"><Loader2 className="size-4 animate-spin" />Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-card/40 ring-border/60 rounded-xl p-8 text-center ring-1">
          <p className="text-muted-foreground text-sm">No work items yet.</p>
        </div>
      ) : activeView.type === "board" ? (
        <BoardView trackerId={trackerId} items={items} onItemClick={(item) => setExpandedItem(item)} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <WorkItemCard key={item.id} item={item} onEdit={() => { setEditingItem(item); setFormOpen(true); }} onDelete={() => setDeletingItem(item)} onExpand={() => setExpandedItem(item)} />
          ))}
        </div>
      )}
      <WorkItemFormDrawer
        key={editingItem?.id ?? "new"}
        open={formOpen} onOpenChange={setFormOpen} trackerId={trackerId}
        workItem={editingItem}
        epics={epicsData} cycles={cyclesData} modules={modulesData}
        onSuccess={invalidate}
      />
      <WorkItemDetailSheet workItem={expandedItem} open={expandedItem != null} onOpenChange={(o) => !o && setExpandedItem(null)} />
      <AlertDialog open={deletingItem != null} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deletingItem?.title}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => deletingItem && deleteItem({ workItemId: deletingItem.id })}>
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
