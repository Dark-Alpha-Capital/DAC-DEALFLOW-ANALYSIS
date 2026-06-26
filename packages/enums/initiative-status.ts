export const InitiativeStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ON_HOLD: "ON_HOLD",
  CANCELLED: "CANCELLED",
} as const;

export type InitiativeStatus =
  (typeof InitiativeStatus)[keyof typeof InitiativeStatus];

export const INITIATIVE_STATUS_VALUES = [
  "ACTIVE",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
] as const;

export type InitiativeStatusValue =
  (typeof INITIATIVE_STATUS_VALUES)[number];

export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatusValue, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

export const DEFAULT_INITIATIVE_STATUS: InitiativeStatusValue = "ACTIVE";
