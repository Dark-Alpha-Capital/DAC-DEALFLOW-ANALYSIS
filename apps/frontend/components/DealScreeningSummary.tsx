import { Link } from "@tanstack/react-router";
import { AlertCircle, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DealScreeningSummaryProps {
  dealOpportunityId: string;
}

export default function DealScreeningSummary({
  dealOpportunityId,
}: DealScreeningSummaryProps) {
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <BrainCircuit className="h-4 w-4 text-muted-foreground" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          AI screening
        </p>
      </div>
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          View detailed AI analysis, score, and reasoning for this opportunity
          on the full deal page.
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          Linked to screenings
        </Badge>
        <Link
          href={`/deal-opportunities/${dealOpportunityId}`}
          className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
        >
          Open analysis
        </Link>
      </div>
    </div>
  );
}

