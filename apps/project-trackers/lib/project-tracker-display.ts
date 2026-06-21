import {
  PROJECT_STAGE_LABELS,
  type ProjectStageValue,
} from "@repo/enums";

export function scoreColor(score: number | null): string {
  if (score === null) return "";
  if (score >= 3.5) return "text-green-600";
  if (score >= 2) return "text-amber-500";
  return "text-red-500";
}

export function scoreLabel(score: number): string {
  if (score >= 3.5) return "Worth taking";
  if (score >= 2) return "Review needed";
  return "Not recommended";
}

export function scoreBadgeClass(score: number): string {
  if (score >= 3.5) return "bg-green-100 text-green-800";
  if (score >= 2) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function statusBadgeVariant(status: string | null): string {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "running") return "bg-blue-100 text-blue-800";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-muted text-muted-foreground";
}

export function stageLabel(stage: ProjectStageValue): string {
  return PROJECT_STAGE_LABELS[stage];
}

export function stageBadgeVariant(stage: ProjectStageValue): string {
  switch (stage) {
    case "KICKOFF":
      return "bg-slate-100 text-slate-800";
    case "SCOPING":
      return "bg-violet-100 text-violet-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "BLOCKED":
      return "bg-red-100 text-red-800";
    case "SHIPPED":
      return "bg-green-100 text-green-800";
    case "ARCHIVED":
      return "bg-muted text-muted-foreground";
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export function formatTimeInStage(stageChangedAt: Date): string {
  const ms = Date.now() - stageChangedAt.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Less than a day";
  if (days === 1) return "1 day";
  return `${days} days`;
}
