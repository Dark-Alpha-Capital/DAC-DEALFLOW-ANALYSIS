export const ModuleStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ModuleStatus = (typeof ModuleStatus)[keyof typeof ModuleStatus];

export const MODULE_STATUS_VALUES = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ModuleStatusValue = (typeof MODULE_STATUS_VALUES)[number];

export const MODULE_STATUS_LABELS: Record<ModuleStatusValue, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const DEFAULT_MODULE_STATUS: ModuleStatusValue = "ACTIVE";
