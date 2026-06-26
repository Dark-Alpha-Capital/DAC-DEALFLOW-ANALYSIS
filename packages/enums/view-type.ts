export const ViewType = {
  LIST: "list",
  BOARD: "board",
  TIMELINE: "timeline",
  CALENDAR: "calendar",
} as const;

export type ViewType = (typeof ViewType)[keyof typeof ViewType];

export const VIEW_TYPE_VALUES = [
  "list",
  "board",
  "timeline",
  "calendar",
] as const;

export type ViewTypeValue = (typeof VIEW_TYPE_VALUES)[number];

export const VIEW_TYPE_LABELS: Record<ViewTypeValue, string> = {
  list: "List",
  board: "Board",
  timeline: "Timeline",
  calendar: "Calendar",
};

export const DEFAULT_VIEW_TYPE: ViewTypeValue = "list";
