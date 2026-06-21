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
