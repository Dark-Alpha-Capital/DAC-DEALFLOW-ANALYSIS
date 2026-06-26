import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/initiatives")({
  head: () => ({
    meta: [{ title: "Initiatives — Dark Alpha Capital" }],
  }),
  component: InitiativesPage,
});

function InitiativesPage() {
  return (
    <section className="block-space-mini container max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl mb-6">Initiatives</h1>
      <InitiativesList />
    </section>
  );
}

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
import { INITIATIVE_STATUS_VALUES, INITIATIVE_STATUS_LABELS, type ViewTypeValue } from "@repo/enums";
import { createInitiativeSchema } from "@repo/schemas";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2, Flag, Link, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useQuery as useTQQuery } from "@tanstack/react-query";

type InitiativeRecord = {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: Date | null;
  targetDate: Date | null;
  color: string | null;
  createdAt: Date;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE": return "bg-blue-100 text-blue-800";
    case "COMPLETED": return "bg-green-100 text-green-800";
    case "ON_HOLD": return "bg-amber-100 text-amber-800";
    case "CANCELLED": return "bg-red-100 text-red-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function InitiativeFormDrawer({
  open,
  onOpenChange,
  initiative,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative?: InitiativeRecord | null;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const isEditing = initiative != null;

  const form = useForm({
    resolver: zodResolver(createInitiativeSchema),
    defaultValues: {
      name: initiative?.name ?? "",
      description: initiative?.description ?? "",
      status: (initiative?.status ?? "ACTIVE") as "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED",
      startDate: initiative?.startDate ?? null,
      targetDate: initiative?.targetDate ?? null,
      color: initiative?.color ?? null,
    },
  });

  const { mutate: create, isPending: isCreating } = useMutation(
    trpc.initiatives.create.mutationOptions({
      onSuccess: () => { toast.success("Initiative created"); onSuccess(); onOpenChange(false); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: update, isPending: isUpdating } = useMutation(
    trpc.initiatives.update.mutationOptions({
      onSuccess: () => { toast.success("Initiative updated"); onSuccess(); onOpenChange(false); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: any) {
    if (isEditing && initiative) {
      update({ initiativeId: initiative.id, ...values });
    } else {
      create(values);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 border-b px-6 py-5 text-left">
          <SheetTitle>{isEditing ? "Edit initiative" : "New initiative"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Portfolio EBITDA Optimization 2026" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{INITIATIVE_STATUS_VALUES.map((s) => (<SelectItem key={s} value={s}>{INITIATIVE_STATUS_LABELS[s]}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : isEditing ? "Save changes" : "Create initiative"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function InitiativeCard({
  initiative,
  onEdit,
  onDelete,
  onLinkTracker,
}: {
  initiative: InitiativeRecord;
  onEdit: () => void;
  onDelete: () => void;
  onLinkTracker: () => void;
}) {
  return (
    <div className="bg-card/40 ring-border/60 rounded-xl p-4 ring-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {initiative.color && (
              <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: initiative.color }} />
            )}
            <h3 className="font-medium truncate">{initiative.name}</h3>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeClass(initiative.status))}>
              {INITIATIVE_STATUS_LABELS[initiative.status as keyof typeof INITIATIVE_STATUS_LABELS]}
            </span>
          </div>
          {initiative.description.trim() && (
            <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{initiative.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onLinkTracker}><Link className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onEdit}><Pencil className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive size-8" onClick={onDelete}><Trash2 className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function InitiativesList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InitiativeRecord | null>(null);
  const [deleting, setDeleting] = useState<InitiativeRecord | null>(null);

  const listQuery = trpc.initiatives.getAll.queryOptions();
  const { data: initiatives = [], isLoading } = useQuery(listQuery);

  const invalidate = () => { void queryClient.invalidateQueries(listQuery); };

  const { mutate: deleteInitiative, isPending: isDeleting } = useMutation(
    trpc.initiatives.delete.mutationOptions({
      onSuccess: () => { toast.success("Initiative deleted"); setDeleting(null); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Strategic goals that span multiple project trackers.</p>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="size-4" />New initiative
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading…</div>
      ) : initiatives.length === 0 ? (
        <div className="bg-card/40 ring-border/60 rounded-xl p-8 text-center ring-1">
          <p className="text-muted-foreground text-sm">No initiatives yet. Create one to group related projects.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initiatives.map((i) => (
            <InitiativeCard key={i.id} initiative={i} onEdit={() => { setEditing(i); setFormOpen(true); }} onDelete={() => setDeleting(i)} onLinkTracker={() => {}} />
          ))}
        </div>
      )}
      <InitiativeFormDrawer open={formOpen} onOpenChange={setFormOpen} initiative={editing} onSuccess={invalidate} />
      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete initiative?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleting?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => deleting && deleteInitiative({ initiativeId: deleting.id })}>
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
