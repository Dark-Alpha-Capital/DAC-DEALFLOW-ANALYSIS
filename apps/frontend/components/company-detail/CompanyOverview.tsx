import type { Company } from "@repo/db";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, AlertTriangle } from "lucide-react";
import { AssignThemeControl } from "./AssignThemeControl";

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
  const {
    id,
    name,
    industry,
    location,
    coverageStatus,
    themeName,
    themeId,
    businessModel,
    employees,
    recurringRevenuePct,
    totalClients,
    top10Concentration,
    customerIndustries,
    revenueModelType,
    expansionModel,
    concentrationHigh,
    marginLow,
    vendorDependency,
    growthLevers,
  } = company;

  const hasProfile =
    businessModel || employees != null || recurringRevenuePct != null;
  const hasCustomers =
    totalClients != null ||
    top10Concentration != null ||
    (customerIndustries && customerIndustries.length > 0);
  const hasRevenueModel = revenueModelType || expansionModel;
  const hasRisks = concentrationHigh || marginLow || vendorDependency;
  const hasGrowthLevers = growthLevers && growthLevers.length > 0;

  return (
    <div className="space-y-6">
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
        <AssignThemeControl companyId={id} currentThemeId={themeId} />
      </div>

      {hasProfile && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Profile
          </h2>
          <div className="flex flex-wrap gap-2">
            {businessModel && (
              <Badge variant="secondary">{businessModel}</Badge>
            )}
            {employees != null && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <Users className="h-3.5 w-3.5" />
                {employees} employees
              </span>
            )}
            {recurringRevenuePct != null && (
              <span className="text-sm">
                {(recurringRevenuePct * 100).toFixed(0)}% recurring
              </span>
            )}
          </div>
        </div>
      )}

      {hasCustomers && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Customers
          </h2>
          <div className="flex flex-wrap gap-2">
            {totalClients != null && (
              <span className="text-sm">{totalClients} clients</span>
            )}
            {top10Concentration != null && (
              <span className="text-sm">
                Top 10: {(top10Concentration * 100).toFixed(0)}%
              </span>
            )}
            {customerIndustries?.map((ind) => (
              <Badge key={ind} variant="outline">
                {ind}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasRevenueModel && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Revenue Model
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {revenueModelType && <span>{revenueModelType}</span>}
            {expansionModel && (
              <span className="text-muted-foreground">· {expansionModel}</span>
            )}
          </div>
        </div>
      )}

      {hasRisks && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Risks
          </h2>
          <div className="flex flex-wrap gap-2">
            {concentrationHigh && (
              <Badge variant="destructive">High concentration</Badge>
            )}
            {marginLow && (
              <Badge variant="destructive">Low margin</Badge>
            )}
            {vendorDependency && (
              <Badge variant="destructive">Vendor dependency</Badge>
            )}
          </div>
        </div>
      )}

      {hasGrowthLevers && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Growth Levers
          </h2>
          <div className="flex flex-wrap gap-2">
            {growthLevers.map((lever) => (
              <Badge key={lever} variant="secondary">
                {lever.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
