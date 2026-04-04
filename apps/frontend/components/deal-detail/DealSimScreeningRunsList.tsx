import { Link } from "@tanstack/react-router";
import { ExternalLink, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SimScreeningRunForDealRow } from "@repo/db/queries";
import { cn } from "@/lib/utils";

function humanizeStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function statusBadgeClass(status: string): string {
  if (status === "COMPLETED") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "FAILED") {
    return "";
  }
  return "font-normal";
}

export function DealSimScreeningRunsList({
  runs,
}: {
  runs: SimScreeningRunForDealRow[];
}) {
  if (runs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        <Layers className="h-4 w-4" />
        SIM / CIM template runs
      </h3>
      <ul className="space-y-2">
        {runs.map((r) => (
          <li key={r.runId}>
            <Link
              to="/cim-screening/$sessionId"
              params={{ sessionId: r.sessionId }}
              search={{ runId: r.runId }}
              className="border-border hover:bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate font-medium">
                  {r.screenerName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {new Date(r.runCreatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {r.screenerCategory ? ` · ${r.screenerCategory}` : ""}
                </p>
                {r.status === "FAILED" && r.errorMessage ? (
                  <p className="text-destructive mt-1 line-clamp-2 text-xs">
                    {r.errorMessage}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={r.status === "FAILED" ? "destructive" : "secondary"}
                  className={cn(
                    "font-normal",
                    r.status === "COMPLETED" && statusBadgeClass(r.status),
                  )}
                >
                  {humanizeStatus(r.status)}
                </Badge>
                <ExternalLink className="text-muted-foreground h-4 w-4" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
