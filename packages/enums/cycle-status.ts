export const CycleStatus = {
  UPCOMING: "UPCOMING",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;

export type CycleStatus = (typeof CycleStatus)[keyof typeof CycleStatus];

export const CYCLE_STATUS_VALUES = [
  "UPCOMING",
  "ACTIVE",
  "COMPLETED",
] as const;

export type CycleStatusValue = (typeof CYCLE_STATUS_VALUES)[number];

export const CYCLE_STATUS_LABELS: Record<CycleStatusValue, string> = {
  UPCOMING: "Upcoming",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

export const DEFAULT_CYCLE_STATUS: CycleStatusValue = "UPCOMING";
