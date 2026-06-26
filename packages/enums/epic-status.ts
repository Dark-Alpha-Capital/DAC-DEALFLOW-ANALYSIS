export const EpicStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  ON_HOLD: "ON_HOLD",
} as const;

export type EpicStatus = (typeof EpicStatus)[keyof typeof EpicStatus];

export const EPIC_STATUS_VALUES = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
] as const;

export type EpicStatusValue = (typeof EPIC_STATUS_VALUES)[number];

export const EPIC_STATUS_LABELS: Record<EpicStatusValue, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ON_HOLD: "On hold",
};

export const DEFAULT_EPIC_STATUS: EpicStatusValue = "ACTIVE";
