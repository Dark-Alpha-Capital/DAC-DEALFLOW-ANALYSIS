export const ProjectStage = {
  KICKOFF: "KICKOFF",
  SCOPING: "SCOPING",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  SHIPPED: "SHIPPED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProjectStage = (typeof ProjectStage)[keyof typeof ProjectStage];

export const PROJECT_STAGE_VALUES = [
  "KICKOFF",
  "SCOPING",
  "IN_PROGRESS",
  "BLOCKED",
  "SHIPPED",
  "ARCHIVED",
] as const;

export type ProjectStageValue = (typeof PROJECT_STAGE_VALUES)[number];

export const DEFAULT_PROJECT_STAGE: ProjectStageValue = "KICKOFF";

export const PROJECT_STAGE_LABELS: Record<ProjectStageValue, string> = {
  KICKOFF: "Kickoff",
  SCOPING: "Scoping",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  SHIPPED: "Shipped",
  ARCHIVED: "Archived",
};
