import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CYCLE_STATUS_VALUES, CYCLE_STATUS_LABELS } from "@repo/enums";
import { createCycleSchema } from "@repo/schemas";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type CycleFormValues = {
  trackerId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
};

type CycleRecord = {
  id: string;
  trackerId: string;
  name: string;
  description: string;
  status: string;
  startDate: Date;
  endDate: Date;
  sortOrder: number;
  totalItems: number;
  completedItems: number;
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
    case "UPCOMING": return "bg-slate-100 text-slate-800";
    case "COMPLETED": return "bg-green-100 text-green-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function daysRemaining(endDate: Date): number {
  return Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function CycleFormDrawer({
  open,
  onOpenChange,
  trackerId,
  cycle,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  cycle?: CycleRecord | null;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const isEditing = cycle != null;

  const form = useForm<CycleFormValues>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      trackerId,
      name: cycle?.name ?? "",
      description: cycle?.description ?? "",
      startDate: cycle?.startDate ?? new Date(),
      endDate: cycle?.endDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { mutate: create, isPending: isCreating } = useMutation(
    trpc.cycles.create.mutationOptions({
      onSuccess: () => { toast.success("Cycle created"); onSuccess(); onOpenChange(false); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: update, isPending: isUpdating } = useMutation(
    trpc.cycles.update.mutationOptions({
      onSuccess: () => { toast.success("Cycle updated"); onSuccess(); onOpenChange(false); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: CycleFormValues) {
    if (isEditing && cycle) {
      update({ cycleId: cycle.id, ...values });
    } else {
      create(values);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-5 text-left">
          <SheetTitle>{isEditing ? "Edit cycle" : "New cycle"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Sprint 1, Week 1, etc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>Start date</FormLabel><FormControl><Input type="date" value={toDateInputValue(field.value instanceof Date ? field.value : null)} onChange={(e) => { const d = parseDateInput(e.target.value); if (d) field.onChange(d); }} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel>End date</FormLabel><FormControl><Input type="date" value={toDateInputValue(field.value instanceof Date ? field.value : null)} onChange={(e) => { const d = parseDateInput(e.target.value); if (d) field.onChange(d); }} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : isEditing ? "Save changes" : "Create cycle"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function CycleCard({
  cycle,
  onEdit,
  onDelete,
  onComplete,
}: {
  cycle: CycleRecord;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const progress = cycle.totalItems > 0 ? Math.round((cycle.completedItems / cycle.totalItems) * 100) : 0;
  const remaining = daysRemaining(cycle.endDate);
  const isActive = cycle.status === "ACTIVE";

  return (
    <div className={cn("ring-border/60 rounded-xl p-4 ring-1", isActive ? "bg-card/60 ring-primary/30" : "bg-card/40")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{cycle.name}</h3>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass(cycle.status))}>
              {CYCLE_STATUS_LABELS[cycle.status as keyof typeof CYCLE_STATUS_LABELS]}
            </span>
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {new Date(cycle.startDate).toLocaleDateString()} → {new Date(cycle.endDate).toLocaleDateString()}
            {isActive && remaining > 0 && <span className="ml-2 text-amber-600">{remaining}d remaining</span>}
            {isActive && remaining <= 0 && <span className="ml-2 text-red-600">Overdue</span>}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">{cycle.completedItems}/{cycle.totalItems} items completed</div>
        </div>
        <div className="flex shrink-0 gap-1">
          {isActive && <Button type="button" variant="ghost" size="icon" className="size-8 text-green-600" onClick={onComplete}><CheckCircle className="size-4" /></Button>}
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onEdit}><Pencil className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive size-8" onClick={onDelete}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      {cycle.totalItems > 0 && (
        <div className="mt-3 w-full">
          <div className="bg-muted h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function CyclesPanel({ trackerId }: { trackerId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<CycleRecord | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<CycleRecord | null>(null);

  const listQuery = trpc.cycles.listByTracker.queryOptions({ trackerId });
  const { data: cycles = [], isLoading } = useQuery(listQuery);

  const invalidate = () => { void queryClient.invalidateQueries(listQuery); };

  const { mutate: deleteCycle, isPending: isDeleting } = useMutation(
    trpc.cycles.delete.mutationOptions({
      onSuccess: () => { toast.success("Cycle deleted"); setDeletingCycle(null); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: completeCycle, isPending: isCompleting } = useMutation(
    trpc.cycles.complete.mutationOptions({
      onSuccess: () => { toast.success("Cycle completed"); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Cycles</h2>
          <p className="text-muted-foreground text-xs">Time-boxed sprints or phases for this project.</p>
        </div>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => { setEditingCycle(null); setFormOpen(true); }}>
          <Plus className="size-4" />Add cycle
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm"><Loader2 className="size-4 animate-spin" />Loading cycles…</div>
      ) : cycles.length === 0 ? (
        <div className="bg-card/40 ring-border/60 rounded-xl p-8 text-center ring-1">
          <p className="text-muted-foreground text-sm">No cycles yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <CycleCard key={cycle.id} cycle={cycle} onEdit={() => { setEditingCycle(cycle); setFormOpen(true); }} onDelete={() => setDeletingCycle(cycle)} onComplete={() => completeCycle({ cycleId: cycle.id })} />
          ))}
        </div>
      )}
      <CycleFormDrawer open={formOpen} onOpenChange={setFormOpen} trackerId={trackerId} cycle={editingCycle} onSuccess={invalidate} />
      <AlertDialog open={deletingCycle != null} onOpenChange={(open) => !open && setDeletingCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cycle?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deletingCycle?.name}". Work items in this cycle will be unassigned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => deletingCycle && deleteCycle({ cycleId: deletingCycle.id })}>
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
