import { InteractionsFeed } from "@/components/interactions/interactions-feed";
import type { InteractionRow } from "@/components/interactions/interactions-feed";

export function InvestorInteractions(props: {
  investorId: string;
  initialInteractions: InteractionRow[];
}) {
  return (
    <InteractionsFeed
      entity="investor"
      entityId={props.investorId}
      initialInteractions={props.initialInteractions}
    />
  );
}
