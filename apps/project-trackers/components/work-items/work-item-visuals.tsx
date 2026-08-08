import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Minus,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  formatWorkItemDate,
  workItemPriorityColor,
  workItemPriorityLabel,
  workItemStatusDotClass,
  workItemStatusLabel,
} from "@/lib/work-item-display";
import { cn } from "@/lib/utils";
import {
  WORK_ITEM_PRIORITY_VALUES,
  WORK_ITEM_STATUS_VALUES,
  type WorkItemPriorityValue,
  type WorkItemStatusValue,
} from "@repo/enums";
import { useTRPC } from "@/trpc/client";

export function StatusCircle({
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

export function PriorityIcon({
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

export function StatusPill({
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

export function PriorityPill({
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

export function DatePill({
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

export type Member = { id: string; name: string; email: string; image: string | null };

export function useMembers(): Member[] {
  const trpc = useTRPC();
  const { data = [] } = useQuery(trpc.workItems.listMembers.queryOptions());
  return data;
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AssigneeAvatars({
  members,
  userIds,
  size = 20,
}: {
  members: Member[];
  userIds: string[];
  size?: number;
}) {
  const shown = userIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => m != null)
    .slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((m) => (
        <span
          key={m.id}
          title={m.name}
          className="ring-background bg-primary/15 text-primary inline-flex items-center justify-center overflow-hidden rounded-full text-[9px] font-medium ring-2"
          style={{ width: size, height: size }}
        >
          {m.image ? (
            <img
              src={m.image}
              alt={m.name}
              className="size-full rounded-full object-cover"
            />
          ) : (
            memberInitials(m.name)
          )}
        </span>
      ))}
    </div>
  );
}

export function AssigneesPill({
  members,
  value,
  onChange,
}: {
  members: Member[];
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
          size="sm"
          className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-normal"
        >
          {value.length > 0 ? (
            <>
              <AssigneeAvatars members={members} userIds={value} size={18} />
              {value.length > 3 && <span>+{value.length - 3}</span>}
            </>
          ) : (
            <>
              <Users className="size-3.5 opacity-60" />
              Assignees
            </>
          )}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
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
              {value.includes(m.id) && <Check className="text-primary size-3.5" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
