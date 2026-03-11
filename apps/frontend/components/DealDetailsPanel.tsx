import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DealScreeningSummary from "@/components/DealScreeningSummary";
import { formatCurrency } from "@/lib/utils";

type DealOppRow = {
  opp: import("@repo/db").DealOpportunity;
  company: {
    name: string;
    industry: string | null;
    location: string | null;
  } | null;
} | null;

interface DealDetailsPanelProps {
  row: DealOppRow;
}

export default function DealDetailsPanel({ row }: DealDetailsPanelProps) {
  if (!row) {
    return (
      <div className="bg-muted/40 text-muted-foreground flex h-full items-center justify-center rounded-md border p-6 text-sm">
        Select a deal in the pipeline to view details.
      </div>
    );
  }

  const { opp, company } = row;
  const title = company?.name ?? opp.dealTeaser ?? "Deal";
  const detailHref = `/deal-opportunities/${opp.id}`;

  return (
    <aside className="bg-background flex h-full flex-col rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm leading-tight font-semibold">{title}</h2>
        <Badge variant="outline" className="text-[11px] font-medium">
          {opp.stage}
        </Badge>
      </div>

      {company?.industry && (
        <p className="text-muted-foreground text-[11px]">
          {company.industry}
          {company.location && ` • ${company.location}`}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        {opp.revenue != null && (
          <div>
            <p className="text-muted-foreground text-[10px]">Revenue</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {formatCurrency(opp.revenue)}
            </p>
          </div>
        )}
        {opp.ebitda != null && (
          <div>
            <p className="text-muted-foreground text-[10px]">EBITDA</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {formatCurrency(opp.ebitda)}
            </p>
          </div>
        )}
        {opp.askingPrice != null && (
          <div>
            <p className="text-muted-foreground text-[10px]">Asking price</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {formatCurrency(opp.askingPrice)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
        {opp.dealTeaser && (
          <div>
            <p className="text-muted-foreground text-[10px] font-medium">
              Teaser
            </p>
            <p className="text-foreground mt-1 leading-relaxed whitespace-pre-wrap">
              {opp.dealTeaser}
            </p>
          </div>
        )}

        <DealScreeningSummary dealOpportunityId={opp.id} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <Button asChild size="sm" className="flex-1">
          <Link href={detailHref}>Open deal</Link>
        </Button>
      </div>
    </aside>
  );
}
