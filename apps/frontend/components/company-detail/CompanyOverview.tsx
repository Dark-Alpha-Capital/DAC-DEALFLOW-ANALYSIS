import type { Company } from "db";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";

interface CompanyOverviewProps {
  company: Company & { themeName?: string | null };
}

function getStatusColor(status: string): string {
  switch (status) {
    case "UNCONTACTED":
      return "bg-muted text-muted-foreground";
    case "CONTACTED":
      return "bg-primary/10 text-primary";
    case "IN_DISCUSSION":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "UNDER_LOI":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "CLOSED":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "PASSED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function CompanyOverview({ company }: CompanyOverviewProps) {
  const { name, industry, location, coverageStatus, themeName } = company;

  return (
    <div className="space-y-3">
      <Badge className={getStatusColor(coverageStatus)}>
        {coverageStatus}
      </Badge>
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
      {(industry || location || themeName) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {industry && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {industry}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            )}
          </p>
          {themeName && (
            <p>
              <span className="font-medium text-foreground">Theme:</span>{" "}
              {themeName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

