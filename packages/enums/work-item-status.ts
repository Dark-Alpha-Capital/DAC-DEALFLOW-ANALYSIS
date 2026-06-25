export const WorkItemStatus = {
  TODO: "TODO",
  BACKLOG: "BACKLOG",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;

export type WorkItemStatus =
  (typeof WorkItemStatus)[keyof typeof WorkItemStatus];

export const WORK_ITEM_STATUS_VALUES = [
  "TODO",
  "BACKLOG",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
] as const;

export type WorkItemStatusValue = (typeof WORK_ITEM_STATUS_VALUES)[number];

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatusValue, string> = {
  TODO: "Todo",
  BACKLOG: "Backlog",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const DEFAULT_WORK_ITEM_STATUS: WorkItemStatusValue = "TODO";
