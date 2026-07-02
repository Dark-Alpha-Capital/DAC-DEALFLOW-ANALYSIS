import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { EPIC_STATUS_VALUES, EPIC_STATUS_LABELS } from "@repo/enums";
import { createEpicSchema } from "@repo/schemas";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2, Pencil, Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { WorkItemsPanel } from "@/components/work-items/work-items-panel";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";

type EpicFormValues = {
  trackerId: string;
  title: string;
  description: string;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
};

type EpicRecord = {
  id: string;
  trackerId: string;
  title: string;
  description: string;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
  sortOrder: number;
  createdAt: Date;
  workItemCount: number;
  completedWorkItemCount: number;
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

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE": return "bg-blue-100 text-blue-800";
    case "COMPLETED": return "bg-green-100 text-green-800";
    case "CANCELLED": return "bg-red-100 text-red-800";
    case "ON_HOLD": return "bg-amber-100 text-amber-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function EpicFormDialog({
  open,
  onOpenChange,
  trackerId,
  epic,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  epic?: EpicRecord | null;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const isEditing = epic != null;

  const form = useForm<EpicFormValues>({
    resolver: zodResolver(createEpicSchema),
    defaultValues: {
      trackerId,
      title: epic?.title ?? "",
      description: epic?.description ?? "",
      status: epic?.status ?? "ACTIVE",
      startDate: epic?.startDate ?? null,
      dueDate: epic?.dueDate ?? null,
    },
  });

  const { mutate: create, isPending: isCreating } = useMutation(
    trpc.epics.create.mutationOptions({
      onSuccess: () => {
        toast.success("Epic created");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: update, isPending: isUpdating } = useMutation(
    trpc.epics.update.mutationOptions({
      onSuccess: () => {
        toast.success("Epic updated");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: EpicFormValues) {
    if (isEditing && epic) {
      update({ epicId: epic.id, ...values } as Parameters<typeof update>[0]);
    } else {
      create(values as Parameters<typeof create>[0]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit epic" : "Create epic"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="Epic title" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {EPIC_STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>{EPIC_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(parseDateInput(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" value={toDateInputValue(field.value)} onChange={(e) => field.onChange(parseDateInput(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <MarkdownEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    rows={6}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : isEditing ? "Save changes" : "Create epic"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EpicCard({
  epic,
  onOpen,
  onEdit,
  onDelete,
}: {
  epic: EpicRecord;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const progress = epic.workItemCount > 0
    ? Math.round((epic.completedWorkItemCount / epic.workItemCount) * 100)
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="bg-card/40 ring-border/60 cursor-pointer rounded-xl p-4 ring-1 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Layers className="text-muted-foreground size-4 shrink-0" />
            <h3 className="truncate font-medium">{epic.title}</h3>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass(epic.status))}>
              {EPIC_STATUS_LABELS[epic.status as keyof typeof EPIC_STATUS_LABELS]}
            </span>
          </div>
          <div className="text-muted-foreground mt-1 ml-6 text-xs">
            {epic.completedWorkItemCount}/{epic.workItemCount} items
          </div>
          {epic.description.trim() && (
            <p className="text-muted-foreground mt-1 ml-6 text-sm line-clamp-2">{epic.description}</p>
          )}
          {epic.workItemCount > 0 && (
            <div className="mt-3 ml-6 w-full">
              <div className="bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onEdit}><Pencil className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive size-8" onClick={onDelete}><Trash2 className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export function EpicsPanel({ trackerId }: { trackerId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<EpicRecord | null>(null);
  const [deletingEpic, setDeletingEpic] = useState<EpicRecord | null>(null);
  const [viewEpicId, setViewEpicId] = useState<string | null>(null);

  const listQuery = trpc.epics.listByTracker.queryOptions({ trackerId });
  const { data: epics = [], isLoading } = useQuery(listQuery);

  const invalidate = () => { void queryClient.invalidateQueries(listQuery); };

  const { mutate: deleteEpic, isPending: isDeleting } = useMutation(
    trpc.epics.delete.mutationOptions({
      onSuccess: () => { toast.success("Epic deleted"); setDeletingEpic(null); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const viewingEpic = viewEpicId
    ? (epics.find((e) => e.id === viewEpicId) ?? null)
    : null;

  if (viewingEpic) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1.5"
            onClick={() => setViewEpicId(null)}
          >
            <ChevronLeft className="size-4" />
            Epics
          </Button>
          <h2 className="text-base font-semibold">{viewingEpic.title}</h2>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass(viewingEpic.status))}>
            {EPIC_STATUS_LABELS[viewingEpic.status as keyof typeof EPIC_STATUS_LABELS]}
          </span>
          <div className="flex-1" />
          <span className="text-muted-foreground text-xs">
            {viewingEpic.completedWorkItemCount}/{viewingEpic.workItemCount} items
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingEpic(viewingEpic);
              setFormOpen(true);
            }}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Button>
        </div>
        <WorkItemsPanel trackerId={trackerId} scope={{ epicId: viewingEpic.id }} />
        <EpicFormDialog open={formOpen} onOpenChange={setFormOpen} trackerId={trackerId} epic={editingEpic} onSuccess={invalidate} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Epics</h2>
          <p className="text-muted-foreground text-xs">
            Large bodies of work that group related tasks. Click an epic to see its
            work items.
          </p>
        </div>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => { setEditingEpic(null); setFormOpen(true); }}>
          <Plus className="size-4" />Add epic
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm"><Loader2 className="size-4 animate-spin" />Loading epics…</div>
      ) : epics.length === 0 ? (
        <div className="bg-card/40 ring-border/60 rounded-xl p-8 text-center ring-1">
          <p className="text-muted-foreground text-sm">No epics yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {epics.map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              onOpen={() => setViewEpicId(epic.id)}
              onEdit={() => { setEditingEpic(epic); setFormOpen(true); }}
              onDelete={() => setDeletingEpic(epic)}
            />
          ))}
        </div>
      )}
      <EpicFormDialog open={formOpen} onOpenChange={setFormOpen} trackerId={trackerId} epic={editingEpic} onSuccess={invalidate} />
      <AlertDialog open={deletingEpic != null} onOpenChange={(open) => !open && setDeletingEpic(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete epic?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deletingEpic?.title}". Work items in this epic will be unassigned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => deletingEpic && deleteEpic({ epicId: deletingEpic.id })}>
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
