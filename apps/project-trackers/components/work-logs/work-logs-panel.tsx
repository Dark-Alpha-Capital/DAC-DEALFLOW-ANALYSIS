import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createWorkLogSchema } from "@repo/schemas";
import { Loader2, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

type WorkLogRecord = {
  id: string;
  workItemId: string;
  userId: string | null;
  hours: number;
  description: string;
  loggedAt: Date;
  createdAt: Date;
};

export function WorkLogsPanel({ workItemId }: { workItemId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const listQuery = trpc.workLogs.listByWorkItem.queryOptions({ workItemId });
  const { data: logs = [], isLoading } = useQuery(listQuery);

  const totalHoursQuery = trpc.workLogs.totalByWorkItem.queryOptions({ workItemId });
  const { data: totalHours = 0 } = useQuery(totalHoursQuery);

  const form = useForm({
    resolver: zodResolver(createWorkLogSchema),
    defaultValues: { workItemId, hours: 1, description: "", loggedAt: new Date() },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries(listQuery);
    void queryClient.invalidateQueries(totalHoursQuery);
  };

  const { mutate: create, isPending: isCreating } = useMutation(
    trpc.workLogs.create.mutationOptions({
      onSuccess: () => { toast.success("Time logged"); form.reset(); setShowForm(false); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: deleteLog } = useMutation(
    trpc.workLogs.delete.mutationOptions({
      onSuccess: () => { toast.success("Entry deleted"); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );

  function onSubmit(values: { workItemId: string; hours: number; description: string; loggedAt: Date }) {
    create(values);
  }

  function toDateInputValue(date: Date | null): string {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground size-4" />
          <span className="text-foreground text-sm font-medium">{totalHours.toFixed(1)}h total</span>
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-3.5" />Log time
        </Button>
      </div>

      {showForm && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card/40 ring-border/60 space-y-3 rounded-lg p-3 ring-1">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="hours" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" min="0.5" max="168" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="loggedAt" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Date</FormLabel>
                  <FormControl>
                    <Input type="date" value={toDateInputValue(field.value instanceof Date ? field.value : null)} onChange={(e) => { const d = new Date(`${e.target.value}T12:00:00`); if (!Number.isNaN(d.getTime())) field.onChange(d); }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">What did you work on?</FormLabel>
                <FormControl><Input placeholder="Brief description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isCreating}>{isCreating ? "Saving…" : "Save"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Form>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading…</div>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No time logged yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start justify-between gap-2 rounded-lg py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium">{log.hours}h</span>
                  <span className="text-muted-foreground text-xs">{new Date(log.loggedAt).toLocaleDateString()}</span>
                </div>
                {log.description.trim() && <p className="text-muted-foreground text-xs mt-0.5">{log.description}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive size-6 shrink-0" onClick={() => deleteLog({ logId: log.id })}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
