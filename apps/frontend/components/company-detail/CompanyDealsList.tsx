import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { DealOpportunity, Company } from "@repo/db";
import { resolveBitrixStageLabel } from "@repo/bitrix-sync";
import { formatCurrency, formatDateStable } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { ChevronRight } from "lucide-react";

interface CompanyDealsListProps {
  company: Company;
  dealOpportunities: DealOpportunity[];
}

function dealTitle(opp: DealOpportunity, companyName: string) {
  const t = opp.dealTeaser?.trim();
  if (t) return t;
  return companyName;
}

function fmtEnum(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

export function CompanyDealsList({
  company,
  dealOpportunities,
}: CompanyDealsListProps) {
  const trpc = useTRPC();
  const { data: pipelineStages = [] } = useQuery(
    trpc.dealOpportunities.getBitrixPipelineStages.queryOptions(),
  );

  if (dealOpportunities.length === 0) {
    return (
      <div className="border-border space-y-2 border-b pb-6">
        <h2 className="text-muted-foreground text-sm font-medium">
          Deal opportunities
        </h2>
        <p className="text-muted-foreground text-xs">
          No deal opportunities have been created for this company yet.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border space-y-3 border-b pb-6">
      <h2 className="text-muted-foreground text-sm font-medium">
        Deal opportunities
      </h2>
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Deal</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 text-right font-medium">Revenue</th>
              <th className="px-3 py-2 text-right font-medium">EBITDA</th>
              <th className="px-3 py-2 text-right font-medium">Asking</th>
              <th className="w-10 px-2 py-2" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {dealOpportunities.map((opp) => {
              const title = dealTitle(opp, company.name);
              return (
                <tr key={opp.id} className="border-t">
                  <td className="max-w-[14rem] px-3 py-2">
                    <Link
                      to="/deal-opportunities/$uid"
                      params={{ uid: opp.id }}
                      className="text-foreground hover:text-primary line-clamp-2 font-medium underline-offset-4 hover:underline"
                    >
                      {title}
                    </Link>
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-3 py-2">
                    {pipelineStages.length > 0
                      ? resolveBitrixStageLabel(opp.stage, pipelineStages)
                      : opp.stage}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-3 py-2">
                    {fmtEnum(opp.status)}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-3 py-2 tabular-nums">
                    {opp.createdAt
                      ? formatDateStable(opp.createdAt)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {opp.revenue != null ? formatCurrency(opp.revenue) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {opp.ebitda != null ? formatCurrency(opp.ebitda) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {opp.askingPrice != null
                      ? formatCurrency(opp.askingPrice)
                      : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      to="/deal-opportunities/$uid"
                      params={{ uid: opp.id }}
                      className="text-muted-foreground hover:text-foreground inline-flex p-1"
                      aria-label={`Open deal ${title}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
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
