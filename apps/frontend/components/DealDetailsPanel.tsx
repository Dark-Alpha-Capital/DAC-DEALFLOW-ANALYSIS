import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DealScreeningSummary from "@/components/DealScreeningSummary";

type DealOppRow = {
  opp: import("@repo/db").DealOpportunity;
  company: { name: string; industry: string | null; location: string | null } | null;
} | null;

interface DealDetailsPanelProps {
  row: DealOppRow;
}

export default function DealDetailsPanel({ row }: DealDetailsPanelProps) {
  if (!row) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border bg-muted/40 p-6 text-sm text-muted-foreground">
        Select a deal in the pipeline to view details.
      </div>
    );
  }

  const { opp, company } = row;
  const title = company?.name ?? opp.dealTeaser ?? "Deal";
  const detailHref = `/deals/${opp.id}`;

  return (
    <aside className="flex h-full flex-col rounded-md border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        <Badge variant="outline" className="text-[11px] font-medium">
          {opp.stage}
        </Badge>
      </div>

      {company?.industry && (
        <p className="text-[11px] text-muted-foreground">
          {company.industry}
          {company.location && ` • ${company.location}`}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        {opp.revenue != null && (
          <div>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {opp.revenue.toLocaleString()}
            </p>
          </div>
        )}
        {opp.ebitda != null && (
          <div>
            <p className="text-[10px] text-muted-foreground">EBITDA</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {opp.ebitda.toLocaleString()}
            </p>
          </div>
        )}
        {opp.askingPrice != null && (
          <div>
            <p className="text-[10px] text-muted-foreground">Asking price</p>
            <p className="mt-0.5 font-medium tabular-nums">
              {opp.askingPrice.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
        {opp.dealTeaser && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Teaser
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">
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

