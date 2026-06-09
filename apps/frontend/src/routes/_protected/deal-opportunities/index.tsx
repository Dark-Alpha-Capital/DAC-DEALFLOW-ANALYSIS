import { createFileRoute, Link } from "@tanstack/react-router";
import DealsAuthedSkeleton from "@/components/skeletons/DealsAuthedSkeleton";
import { loadRankedDealOpportunitiesPageData } from "@/lib/server/deal-opportunities-route-data";
import { Button } from "@/components/ui/button";
import { Sparkles, ClipboardCheck } from "lucide-react";
import { DealsWorkspace } from "@/components/deal-opportunities/deals-workspace";
import { PullNewDealsFromBitrixButton } from "@/components/deal-opportunities/sync-bitrix-deals-button";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

import {
  dealOpportunitiesListLoaderDeps,
  looseValidateSearch,
} from "@/lib/route-search";

export const Route = createFileRoute("/_protected/deal-opportunities/")({
  validateSearch: (input: Record<string, unknown>) =>
    dealOpportunitiesListLoaderDeps(looseValidateSearch(input)),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [{ title: "Deal opportunities — Dark Alpha Capital" }],
  }),
  loader: async ({ deps }) => {
    const { page, limit, q } = deps;
    const offset = (page - 1) * limit;

    const result = await loadRankedDealOpportunitiesPageData({
      data: { offset, limit, query: q },
    });

    return {
      ...result,
      currentPage: page,
      pageSize: limit,
    };
  },
  pendingComponent: DealsAuthedSkeleton,
  component: DealOpportunitiesRoute,
});

function DealOpportunitiesRoute() {
  const { q } = Route.useSearch();
  const loaderData = Route.useLoaderData();

  const {
    deals,
    pipelineStages,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
  } = loaderData;

  const hasSearch = q.trim().length > 0;

  const dealsSummary =
    totalCount === 0
      ? hasSearch
        ? "No deals match your search."
        : "No deals yet."
      : totalCount === 1
        ? hasSearch
          ? "1 deal matches your search."
          : "1 deal total."
        : hasSearch
          ? `${totalCount} deals match your search.`
          : `${totalCount} deals total.`;
  return (
    <section className="block-space-mini group container max-w-full min-w-0 overflow-x-hidden">
      <div className="mb-8 flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 shrink space-y-1">
          <h1 className="text-4xl font-bold md:text-5xl">Deal opportunities</h1>
          <p
            className="text-muted-foreground text-sm tabular-nums"
            aria-live="polite"
          >
            {dealsSummary}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PullNewDealsFromBitrixButton />
          <Button asChild size="sm" variant="outline">
            <Link to="/deal-opportunities/quick-add" className="gap-2">
              Quick add
            </Link>
          </Button>
          <Button asChild size="sm" variant="default">
            <Link to="/deal-opportunities/ai-bitrix" className="gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              AI → Bitrix
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/deal-opportunities/screen-bitrix" className="gap-2">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Screening widget
            </Link>
          </Button>
        </div>
      </div>

      <DealsWorkspace
        deals={deals}
        pipelineStages={pipelineStages}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </section>
  );
}
