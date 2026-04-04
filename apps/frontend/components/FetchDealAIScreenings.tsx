import { AlertTriangle } from "lucide-react";
import type { AiScreening } from "@repo/db/schema";
import type { SimScreeningRunForDealRow } from "@repo/db/queries";
import { DealType } from "@repo/db/enums";
import AIReasoning from "./AiReasoning";
import { RunAiScreeningButton } from "@/components/deal-opportunities/run-ai-screening-button";
import { DealSimScreeningRunsList } from "@/components/deal-detail/DealSimScreeningRunsList";

const FetchDealAIScreenings = ({
  dealId,
  dealType,
  aiScreenings,
  simScreeningRunsForDeal = [],
}: {
  dealId: string;
  dealType: DealType;
  aiScreenings: AiScreening[];
  simScreeningRunsForDeal?: SimScreeningRunForDealRow[];
}) => {
  const hasSimRuns = simScreeningRunsForDeal.length > 0;
  const hasLegacy = aiScreenings && aiScreenings.length > 0;
  const showEmpty = !hasSimRuns && !hasLegacy;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <RunAiScreeningButton dealOpportunityId={dealId} />
      </div>

      <DealSimScreeningRunsList runs={simScreeningRunsForDeal} />

      <div>
        {hasLegacy ? (
          aiScreenings.map((e) => (
            <AIReasoning
              key={e.id}
              title={e.title}
              explanation={e.explanation}
              sentiment={e.sentiment}
              score={e.score}
              content={e.content}
              dealId={dealId}
              dealType={dealType}
              screeningId={e.id}
            />
          ))
        ) : (
          <>
            {showEmpty ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                <AlertTriangle className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="text-foreground text-sm font-medium">
                  No AI screenings yet
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Run template screening from this deal (CIM screening) or use
                  &quot;Run AI screening&quot; for RAG across ingested documents.
                  SIM sessions linked to this opportunity appear here.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No legacy qualitative AI summaries on file. Template runs are
                listed above.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FetchDealAIScreenings;
