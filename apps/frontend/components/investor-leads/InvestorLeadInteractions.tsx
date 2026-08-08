import { InteractionsFeed } from "@/components/interactions/interactions-feed";
import type { InteractionRow } from "@/components/interactions/interactions-feed";

export function InvestorLeadInteractions(props: {
  investorLeadId: string;
  initialInteractions: InteractionRow[];
}) {
  return (
    <InteractionsFeed
      entity="investorLead"
      entityId={props.investorLeadId}
      initialInteractions={props.initialInteractions}
    />
  );
}
