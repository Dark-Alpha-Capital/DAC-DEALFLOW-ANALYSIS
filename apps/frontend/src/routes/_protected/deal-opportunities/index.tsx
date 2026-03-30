import { createFileRoute, Link } from "@tanstack/react-router";
import DealsAuthedSkeleton from "@/components/skeletons/DealsAuthedSkeleton";
import { loadRankedDealOpportunitiesPageData } from "@/lib/server/deal-opportunities-route-data";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DealsWorkspace } from "@/components/deal-opportunities/deals-workspace";

export const Route = createFileRoute("/_protected/deal-opportunities/")({
  head: () => ({
    meta: [{ title: "Deal opportunities — Dark Alpha Capital" }],
  }),
  loader: async () => loadRankedDealOpportunitiesPageData(),
  pendingComponent: DealsAuthedSkeleton,
  component: DealOpportunitiesRoute,
});

function DealOpportunitiesRoute() {
  const { deals } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Deal opportunities</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/deal-opportunities/quick-add" className="gap-2">
              Quick add
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/deal-opportunities/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New deal opportunity
            </Link>
          </Button>
        </div>
      </div>

      <DealsWorkspace deals={deals} />
    </section>
  );
}
