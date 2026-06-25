import {
  WORK_ITEM_STATUS_LABELS,
  type WorkItemStatusValue,
} from "@repo/enums";

export function workItemStatusLabel(status: WorkItemStatusValue): string {
  return WORK_ITEM_STATUS_LABELS[status];
}

export function workItemStatusBadgeClass(status: WorkItemStatusValue): string {
  switch (status) {
    case "TODO":
      return "bg-slate-100 text-slate-800";
    case "BACKLOG":
      return "bg-violet-100 text-violet-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "DONE":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-muted text-muted-foreground line-through";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatWorkItemDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
