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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              No AI reasoning available
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI analysis for this deal has not been generated yet.
            </p>
            <Button className="mt-4" variant="outline" size="sm">
              Request analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FetchDealAIScreenings;
