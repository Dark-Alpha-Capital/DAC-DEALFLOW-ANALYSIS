
import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  Mail,
  PhoneCall,
  Users,
  Sparkles,
  CalendarClock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

const InteractionSchema = z.object({
  type: z.enum(["EMAIL", "CALL", "MEETING", "EVENT", "INTRO"]),
  notes: z.string().optional(),
  outcome: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof InteractionSchema>;

type InteractionRow = {
  id: string;
  type: "EMAIL" | "CALL" | "MEETING" | "EVENT" | "INTRO" | null;
  notes: string | null;
  outcome: string | null;
  createdAt: Date;
};

const typeMeta: Record<
  NonNullable<InteractionRow["type"]>,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  EMAIL: { label: "Email", Icon: Mail },
  CALL: { label: "Call", Icon: PhoneCall },
  MEETING: { label: "Meeting", Icon: Users },
  EVENT: { label: "Event", Icon: Sparkles },
  INTRO: { label: "Intro", Icon: CalendarClock },
};

function formatDay(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function InteractionDialog(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  busy: boolean;
  editing: InteractionRow | null;
  form: ReturnType<typeof useForm<InteractionFormValues>>;
  onSubmit: (values: InteractionFormValues) => void;
  creating: boolean;
  updating: boolean;
}) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(v) => {
        if (props.busy) return;
        props.setOpen(v);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {props.editing ? "Edit interaction" : "Log interaction"}
          </DialogTitle>
          <DialogDescription>
            Keep it short. You can always refine later.
          </DialogDescription>
        </DialogHeader>

        <Form {...props.form}>
          <form
            onSubmit={props.form.handleSubmit(props.onSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <FormField
                control={props.form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="sm:col-span-4">
                    <FormLabel className="text-xs">Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(typeMeta).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={props.form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem className="sm:col-span-8">
                    <FormLabel className="text-xs">Outcome</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-9"
                        placeholder="Next step / result"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={props.form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[120px] resize-none"
                      placeholder="What happened?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => props.setOpen(false)}
                disabled={props.busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={props.busy}>
                {props.editing
                  ? props.updating
                    ? "Saving…"
                    : "Save"
                  : props.creating
                    ? "Saving…"
                    : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InteractionTimelineItem(props: {
  item: InteractionRow;
  busy: boolean;
  onEdit: (item: InteractionRow) => void;
  onDelete: (item: InteractionRow) => void;
}) {
  const i = props.item;
  const meta = i.type ? typeMeta[i.type] : null;
  const Icon = meta?.Icon ?? CalendarClock;

  return (
    <li className="group relative">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <span className="text-sm font-medium tracking-tight">
                {meta?.label ?? i.type ?? "Interaction"}
              </span>
              <span className="text-muted-foreground hidden text-[11px] sm:inline">
                •
              </span>
              <span className="text-muted-foreground text-[11px]">
                {formatDay(new Date(i.createdAt))}
              </span>
            </span>
          </div>

          {i.notes ? (
            <p className="text-foreground/95 mt-2 text-sm leading-relaxed whitespace-pre-wrap">
              {i.notes}
            </p>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">No notes.</p>
          )}

          {i.outcome ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-[11px] tracking-wider uppercase">
                Outcome
              </span>
              <span className="text-muted-foreground/90 text-xs">
                {i.outcome}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-muted-foreground text-[11px] sm:hidden">
            {formatDay(new Date(i.createdAt))}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-foreground h-8 w-8",
                  "sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100",
                )}
                disabled={props.busy}
                aria-label="Interaction actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => props.onEdit(i)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => props.onDelete(i)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

export function InvestorLeadInteractions(props: {
  investorLeadId: string;
  initialInteractions: InteractionRow[];
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const [items, setItems] = React.useState<InteractionRow[]>(
    props.initialInteractions,
  );
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<InteractionRow | null>(null);

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(InteractionSchema),
    defaultValues: { type: "EMAIL", notes: "", outcome: "" },
  });

  const { mutate: createInteraction, isPending: creating } = useMutation(
    trpc.investorLeads.createInteraction.mutationOptions({
      onSuccess: async () => {
        toast.success("Interaction logged");
        setOpen(false);
        setEditing(null);
        form.reset({ type: form.getValues("type"), notes: "", outcome: "" });
        router.refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to log interaction"),
    }),
  );

  const { mutate: updateInteraction, isPending: updating } = useMutation(
    trpc.investorLeads.updateInteraction.mutationOptions({
      onSuccess: async () => {
        toast.success("Interaction updated");
        setOpen(false);
        setEditing(null);
        router.refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to update interaction"),
    }),
  );

  const { mutate: deleteInteraction, isPending: deleting } = useMutation(
    trpc.investorLeads.deleteInteraction.mutationOptions({
      onSuccess: async () => {
        toast.success("Interaction deleted");
        router.refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to delete interaction"),
    }),
  );

  React.useEffect(() => {
    setItems(props.initialInteractions);
  }, [props.initialInteractions]);

  function onSubmit(values: InteractionFormValues) {
    const payload = {
      investorLeadId: props.investorLeadId,
      type: values.type,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
      outcome: values.outcome?.trim() ? values.outcome.trim() : undefined,
    };

    if (editing) {
      updateInteraction({ ...payload, id: editing.id });
    } else {
      createInteraction(payload);
    }
  }

  const busy = creating || updating || deleting;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-sm font-medium tracking-tight">Interactions</h2>
          <p className="text-muted-foreground text-xs">
            Log every touchpoint. Keep it short, factual, and searchable.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-2"
          onClick={() => {
            setEditing(null);
            form.reset({ type: "EMAIL", notes: "", outcome: "" });
            setOpen(true);
          }}
          disabled={busy}
        >
          <Plus className="h-4 w-4" />
          Log
        </Button>
      </div>

      <InteractionDialog
        open={open}
        setOpen={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        busy={busy}
        editing={editing}
        form={form}
        onSubmit={onSubmit}
        creating={creating}
        updating={updating}
      />

      {items.length ? (
        <ol className="border-border/60 relative space-y-8 border-l pl-6">
          {items.map((i) => (
            <InteractionTimelineItem
              key={i.id}
              item={i}
              busy={busy}
              onEdit={(item) => {
                setEditing(item);
                form.reset({
                  type: (item.type ?? "EMAIL") as InteractionFormValues["type"],
                  notes: item.notes ?? "",
                  outcome: item.outcome ?? "",
                });
                setOpen(true);
              }}
              onDelete={(item) => {
                deleteInteraction({
                  investorLeadId: props.investorLeadId,
                  id: item.id,
                });
              }}
            />
          ))}
        </ol>
      ) : (
        <div className="text-muted-foreground text-sm">
          No interactions yet.
        </div>
      )}
    </div>
  );
}
