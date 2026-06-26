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
import { EPIC_STATUS_VALUES, EPIC_STATUS_LABELS } from "@repo/enums";
import { createEpicSchema } from "@repo/schemas";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

function EpicFormDrawer({
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-5 text-left">
          <SheetTitle>{isEditing ? "Edit epic" : "New epic"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
                  <FormControl><Textarea rows={5} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : isEditing ? "Save changes" : "Create epic"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function EpicCard({
  epic,
  onEdit,
  onDelete,
}: {
  epic: EpicRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = epic.workItemCount > 0
    ? Math.round((epic.completedWorkItemCount / epic.workItemCount) * 100)
    : 0;

  return (
    <div className="bg-card/40 ring-border/60 rounded-xl p-4 ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 cursor-pointer">
            {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
            <h3 className="font-medium truncate">{epic.title}</h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 ml-6">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass(epic.status))}>
              {EPIC_STATUS_LABELS[epic.status as keyof typeof EPIC_STATUS_LABELS]}
            </span>
            <span className="text-muted-foreground text-xs">
              {epic.completedWorkItemCount}/{epic.workItemCount} items
            </span>
          </div>
          {epic.workItemCount > 0 && (
            <div className="mt-3 ml-6 w-full">
              <div className="bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onEdit}><Pencil className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive size-8" onClick={onDelete}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      {expanded && epic.description.trim() && (
        <p className="text-muted-foreground mt-3 ml-6 text-sm whitespace-pre-wrap">{epic.description}</p>
      )}
      {expanded && epic.startDate && epic.dueDate && (
        <div className="text-muted-foreground mt-2 ml-6 flex gap-4 text-xs">
          <span>Start: {epic.startDate.toLocaleDateString()}</span>
          <span>Due: {epic.dueDate.toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}

export function EpicsPanel({ trackerId }: { trackerId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<EpicRecord | null>(null);
  const [deletingEpic, setDeletingEpic] = useState<EpicRecord | null>(null);

  const listQuery = trpc.epics.listByTracker.queryOptions({ trackerId });
  const { data: epics = [], isLoading } = useQuery(listQuery);

  const invalidate = () => { void queryClient.invalidateQueries(listQuery); };

  const { mutate: deleteEpic, isPending: isDeleting } = useMutation(
    trpc.epics.delete.mutationOptions({
      onSuccess: () => { toast.success("Epic deleted"); setDeletingEpic(null); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Epics</h2>
          <p className="text-muted-foreground text-xs">Large bodies of work that group related tasks.</p>
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
            <EpicCard key={epic.id} epic={epic} onEdit={() => { setEditingEpic(epic); setFormOpen(true); }} onDelete={() => setDeletingEpic(epic)} />
          ))}
        </div>
      )}
      <EpicFormDrawer open={formOpen} onOpenChange={setFormOpen} trackerId={trackerId} epic={editingEpic} onSuccess={invalidate} />
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
