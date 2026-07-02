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
import { MODULE_STATUS_LABELS, MODULE_STATUS_VALUES } from "@repo/enums";
import { createModuleSchema } from "@repo/schemas";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2, Pencil, Plus, Trash2, Folder, Users, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { WorkItemsPanel } from "@/components/work-items/work-items-panel";
import { MarkdownEditor } from "@/components/markdown-editor/MarkdownEditorLazy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ModuleFormValues = {
  trackerId: string;
  name: string;
  description: string;
  status: string;
  memberUserIds: string[];
};

type ModuleRecord = {
  id: string;
  trackerId: string;
  name: string;
  description: string;
  status: string;
  leadUserId: string | null;
  sortOrder: number;
  workItemCount: number;
  members: string[];
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-100 text-blue-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

type MemberOption = { id: string; name: string };

function MemberAvatars({
  members,
  userIds,
  size = 20,
}: {
  members: MemberOption[];
  userIds: string[];
  size?: number;
}) {
  const shown = userIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is MemberOption => m != null)
    .slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <span className="flex items-center">
      {shown.map((m, i) => (
        <span
          key={m.id}
          className={cn(
            "bg-primary/15 text-primary ring-background inline-flex items-center justify-center rounded-full text-[9px] font-medium ring-2",
            i > 0 && "-ml-1.5",
          )}
          style={{ width: size, height: size }}
        >
          {memberInitials(m.name)}
        </span>
      ))}
    </span>
  );
}

function MembersPill({
  members,
  value,
  onChange,
}: {
  members: MemberOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          {value.length > 0 ? (
            <span className="flex items-center gap-2">
              <MemberAvatars members={members} userIds={value} size={20} />
              <span className="text-muted-foreground text-xs">
                {value.length} member{value.length > 1 ? "s" : ""}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Users className="size-4 opacity-60" />
              Add members
            </span>
          )}
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-64 w-56 overflow-y-auto"
      >
        {members.length === 0 ? (
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            No members
          </div>
        ) : (
          members.map((m) => (
            <DropdownMenuItem
              key={m.id}
              onSelect={(e) => {
                e.preventDefault();
                toggle(m.id);
              }}
              className="gap-2"
            >
              <span className="bg-primary/15 text-primary inline-flex size-5 items-center justify-center rounded-full text-[9px] font-medium">
                {memberInitials(m.name)}
              </span>
              <span className="flex-1 truncate">{m.name}</span>
              {value.includes(m.id) && (
                <Check className="text-primary size-3.5" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModuleFormDialog({
  open,
  onOpenChange,
  trackerId,
  module: mod,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  module?: ModuleRecord | null;
  onSuccess: () => void;
}) {
  const trpc = useTRPC();
  const isEditing = mod != null;
  const { data: members = [] } = useQuery(
    trpc.workItems.listMembers.queryOptions(),
  );

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: {
      trackerId,
      name: mod?.name ?? "",
      description: mod?.description ?? "",
      status: mod?.status ?? "ACTIVE",
      memberUserIds: mod?.members ?? [],
    },
  });

  const { mutate: create, isPending: isCreating } = useMutation(
    trpc.modules.create.mutationOptions({
      onSuccess: () => {
        toast.success("Module created");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const { mutate: update, isPending: isUpdating } = useMutation(
    trpc.modules.update.mutationOptions({
      onSuccess: () => {
        toast.success("Module updated");
        onSuccess();
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isPending = isCreating || isUpdating;

  function onSubmit(values: ModuleFormValues) {
    if (isEditing && mod) {
      update({
        moduleId: mod.id,
        ...values,
      } as Parameters<typeof update>[0]);
    } else {
      create(values as Parameters<typeof create>[0]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit module" : "Create module"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Financial Analysis" {...field} />
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
                      {MODULE_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MODULE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberUserIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Members</FormLabel>
                  <FormControl>
                    <MembersPill
                      members={members}
                      value={field.value}
                      onChange={field.onChange}
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
                      rows={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
                    : "Create module"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ModuleCard({
  module: mod,
  onOpen,
  onEdit,
  onDelete,
}: {
  module: ModuleRecord;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
            <Folder className="text-muted-foreground size-4 shrink-0" />
            <h3 className="truncate font-medium">{mod.name}</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                statusBadgeClass(mod.status),
              )}
            >
              {MODULE_STATUS_LABELS[mod.status as keyof typeof MODULE_STATUS_LABELS]}
            </span>
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {mod.workItemCount} work items
            {mod.members.length > 0 &&
              ` · ${mod.members.length} member${mod.members.length > 1 ? "s" : ""}`}
          </div>
          {mod.description.trim() && (
            <p className="text-muted-foreground mt-1 text-sm">{mod.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ModulesPanel({ trackerId }: { trackerId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null);
  const [deletingModule, setDeletingModule] = useState<ModuleRecord | null>(null);
  const [viewModuleId, setViewModuleId] = useState<string | null>(null);

  const listQuery = trpc.modules.listByTracker.queryOptions({ trackerId });
  const { data: modules = [], isLoading } = useQuery(listQuery);

  const invalidate = () => {
    void queryClient.invalidateQueries(listQuery);
  };

  const { mutate: deleteModule, isPending: isDeleting } = useMutation(
    trpc.modules.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Module deleted");
        setDeletingModule(null);
        invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const viewingModule = viewModuleId
    ? (modules.find((m) => m.id === viewModuleId) ?? null)
    : null;

  if (viewingModule) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 gap-1.5"
            onClick={() => setViewModuleId(null)}
          >
            <ChevronLeft className="size-4" />
            Modules
          </Button>
          <h2 className="text-base font-semibold">{viewingModule.name}</h2>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              statusBadgeClass(viewingModule.status),
            )}
          >
            {MODULE_STATUS_LABELS[viewingModule.status as keyof typeof MODULE_STATUS_LABELS]}
          </span>
          <div className="flex-1" />
          <span className="text-muted-foreground text-xs">
            {viewingModule.workItemCount} work items
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingModule(viewingModule);
              setFormOpen(true);
            }}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Button>
        </div>
        <WorkItemsPanel
          trackerId={trackerId}
          scope={{ moduleId: viewingModule.id }}
        />
        <ModuleFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          trackerId={trackerId}
          module={editingModule}
          onSuccess={invalidate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Modules</h2>
          <p className="text-muted-foreground text-xs">
            Logical groupings like departments or functional areas. Click a module
            to see its work items.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditingModule(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add module
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading modules…
        </div>
      ) : modules.length === 0 ? (
        <div className="bg-card/40 ring-border/60 rounded-xl p-8 text-center ring-1">
          <p className="text-muted-foreground text-sm">No modules yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              onOpen={() => setViewModuleId(mod.id)}
              onEdit={() => {
                setEditingModule(mod);
                setFormOpen(true);
              }}
              onDelete={() => setDeletingModule(mod)}
            />
          ))}
        </div>
      )}
      <ModuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        trackerId={trackerId}
        module={editingModule}
        onSuccess={invalidate}
      />
      <AlertDialog
        open={deletingModule != null}
        onOpenChange={(open) => !open && setDeletingModule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingModule?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() =>
                deletingModule && deleteModule({ moduleId: deletingModule.id })
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
