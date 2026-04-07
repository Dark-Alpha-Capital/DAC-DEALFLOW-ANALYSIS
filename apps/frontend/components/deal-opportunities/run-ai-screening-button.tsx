import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function RunAiScreeningButton({
  dealOpportunityId: _dealOpportunityId,
}: {
  dealOpportunityId: string;
}) {
  return (
    <Button size="sm" variant="secondary" asChild>
      <Link to="/screening/new-run">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="ml-1.5">Run AI screening</span>
      </Link>
    </Button>
  );
}
