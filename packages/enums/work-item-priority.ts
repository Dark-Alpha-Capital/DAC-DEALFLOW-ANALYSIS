export const WorkItemPriority = {
  URGENT: "URGENT",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  NONE: "NONE",
} as const;

export type WorkItemPriority =
  (typeof WorkItemPriority)[keyof typeof WorkItemPriority];

export const WORK_ITEM_PRIORITY_VALUES = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "NONE",
] as const;

export type WorkItemPriorityValue =
  (typeof WORK_ITEM_PRIORITY_VALUES)[number];

export const DEFAULT_WORK_ITEM_PRIORITY: WorkItemPriorityValue = "NONE";

export const WORK_ITEM_PRIORITY_LABELS: Record<WorkItemPriorityValue, string> =
  {
    URGENT: "Urgent",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
    NONE: "None",
  };
