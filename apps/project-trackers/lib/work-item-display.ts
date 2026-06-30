import {
  WORK_ITEM_STATUS_LABELS,
  WORK_ITEM_PRIORITY_LABELS,
  type WorkItemStatusValue,
  type WorkItemPriorityValue,
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

export function workItemStatusDotClass(status: WorkItemStatusValue): string {
  switch (status) {
    case "TODO":
      return "border-2 border-slate-400";
    case "BACKLOG":
      return "border-2 border-dashed border-violet-400";
    case "IN_PROGRESS":
      return "bg-blue-500";
    case "DONE":
      return "bg-green-500";
    case "CANCELLED":
      return "bg-slate-300";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function workItemPriorityLabel(priority: WorkItemPriorityValue): string {
  return WORK_ITEM_PRIORITY_LABELS[priority];
}

export function workItemPriorityColor(priority: WorkItemPriorityValue): string {
  switch (priority) {
    case "URGENT":
      return "text-red-500";
    case "HIGH":
      return "text-orange-500";
    case "MEDIUM":
      return "text-yellow-500";
    case "LOW":
      return "text-blue-500";
    case "NONE":
      return "text-slate-400";
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

export function workItemPriorityBgClass(priority: WorkItemPriorityValue): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-50 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "LOW":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "NONE":
      return "bg-slate-50 text-slate-500 border-slate-200";
    default: {
      const _exhaustive: never = priority;
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
