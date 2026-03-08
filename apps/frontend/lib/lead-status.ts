const LEAD_STATUS_CLASSNAMES: Record<string, string> = {
  NEW: "bg-primary/10 text-primary",
  PROCESSED: "bg-green-500/10 text-green-600 dark:text-green-400",
  DUPLICATE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  REJECTED: "bg-destructive/10 text-destructive",
};

export function getLeadStatusClassName(status: string | null | undefined): string {
  if (!status) return "bg-muted text-muted-foreground";
  return LEAD_STATUS_CLASSNAMES[status] ?? "bg-muted text-muted-foreground";
}
