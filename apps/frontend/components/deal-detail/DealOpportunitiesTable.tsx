import Link from "next/link";
import type { DealOpportunity, Company } from "@repo/db";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface DealOpportunitiesTableProps {
  dealOpportunities: DealOpportunity[];
  company: Company | null;
  currentOppId: string;
}

function getSourceLabel(opp: DealOpportunity): string {
  if (opp.sourceWebsite) return opp.sourceWebsite;
  if (opp.dealType === "MANUAL") return "Direct outreach";
  return opp.dealType ?? "—";
}

export function DealOpportunitiesTable({
  dealOpportunities,
  company,
  currentOppId,
}: DealOpportunitiesTableProps) {
  if (dealOpportunities.length === 0) {
    return (
      <div className="border-border space-y-2 border-b pb-6">
        <h2 className="text-muted-foreground text-sm font-medium">
          Deal opportunities
        </h2>
        <p className="text-muted-foreground text-xs">
          No deal opportunities for this company.
        </p>
      </div>
    );
  }

  const companyMeta = {
    name: company?.name ?? null,
    industry: company?.industry ?? null,
    location: company?.location ?? null,
  };

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <h2 className="text-muted-foreground text-sm font-medium">
        Deal opportunities
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b text-left">
              <th className="text-muted-foreground pb-2 pr-4 font-medium">
                Deal
              </th>
              <th className="text-muted-foreground pb-2 pr-4 font-medium">
                Stage
              </th>
              <th className="text-muted-foreground pb-2 pr-4 font-medium">
                Asking Price
              </th>
              <th className="text-muted-foreground pb-2 pr-4 font-medium">
                Source
              </th>
              <th className="text-muted-foreground pb-2 pr-4 font-medium">
                Status
              </th>
              <th className="text-muted-foreground pb-2 pr-4 font-medium">
                Created At
              </th>
              <th className="text-muted-foreground pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {dealOpportunities.map((opp) => {
              const isCurrent = opp.id === currentOppId;
              const title =
                companyMeta.name ?? opp.dealTeaser ?? opp.sourceWebsite ?? "Deal";
              return (
                <tr
                  key={opp.id}
                  className={`border-border border-b last:border-0 ${
                    isCurrent ? "bg-muted/50" : ""
                  }`}
                >
                  <td className="py-3 pr-4">
                    <span className="font-medium text-foreground">
                      {title.length > 40 ? title.slice(0, 40) + "…" : title}
                    </span>
                    {isCurrent && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Current
                      </Badge>
                    )}
                  </td>
                  <td className="text-muted-foreground py-3 pr-4">{opp.stage}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    {opp.askingPrice != null
                      ? formatCurrency(opp.askingPrice)
                      : "—"}
                  </td>
                  <td className="text-muted-foreground py-3 pr-4">
                    {getSourceLabel(opp)}
                  </td>
                  <td className="py-3 pr-4">{opp.status}</td>
                  <td className="text-muted-foreground py-3 pr-4">
                    {opp.createdAt
                      ? new Date(opp.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-3">
                    {!isCurrent && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/deals/${opp.id}`} className="gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
