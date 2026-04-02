import { AlertTriangle } from "lucide-react";
import type { AiScreening } from "@repo/db/schema";
import { DealType } from "@repo/db/enums";
import AIReasoning from "./AiReasoning";
import { RunAiScreeningButton } from "@/components/deal-opportunities/run-ai-screening-button";

const FetchDealAIScreenings = ({
  dealId,
  dealType,
  aiScreenings,
}: {
  dealId: string;
  dealType: DealType;
  aiScreenings: AiScreening[];
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <RunAiScreeningButton dealOpportunityId={dealId} />
      </div>
      <div>
        {aiScreenings && aiScreenings.length > 0 ? (
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
            <AlertTriangle className="text-muted-foreground mb-4 h-10 w-10" />
            <h3 className="text-foreground text-sm font-medium">
              No AI screenings yet
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Run AI screening to get qualitative analysis of revenue
              predictability, market growth, competitive advantage, and key
              risks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FetchDealAIScreenings;
