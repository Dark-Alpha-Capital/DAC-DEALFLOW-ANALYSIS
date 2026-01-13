import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { DealType, AiScreening } from "db/schema";
import AIReasoning from "./AiReasoning";

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
    <div>
      <div>
        {aiScreenings && aiScreenings.length > 0 ? (
          aiScreenings.map((e, index) => (
            <AIReasoning
              key={index}
              title={e.title}
              explanation={e.explanation}
              sentiment={e.sentiment}
              dealId={dealId}
              dealType={dealType}
              screeningId={e.id}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No AI Reasoning Available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI analysis for this deal has not been generated yet. Check back
              later or request an analysis.
            </p>
            <Button className="mt-4" variant="outline">
              Request AI Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FetchDealAIScreenings;
