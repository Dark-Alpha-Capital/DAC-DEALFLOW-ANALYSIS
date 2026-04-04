import { createFileRoute, Link } from "@tanstack/react-router";
import InvestorContainer from "@/components/InvestorContainer";
import { loadInvestorsPageData } from "@/lib/server/investors-route-data";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import LeadsAuthedSkeleton from "@/components/skeletons/LeadsAuthedSkeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import {
  asNumber,
  looseValidateSearch,
  paginatedListLoaderDeps,
  type LooseSearch,
} from "@/lib/route-search";

export const Route = createFileRoute("/_protected/investors")({
  validateSearch: (search: Record<string, unknown>): LooseSearch =>
    looseValidateSearch(search),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => paginatedListLoaderDeps(search),
  head: () => ({
    meta: [{ title: "Investors — Dark Alpha Capital" }],
  }),
  loader: async ({ location }) => {
    const search = location.search as LooseSearch;
    const currentPage = Math.max(1, asNumber(search.page, 1));
    const limit = Math.max(1, asNumber(search.limit, 25));
    const offset = (currentPage - 1) * limit;
    const page = await loadInvestorsPageData({ data: { offset, limit } });
    return { ...page, currentPage };
  },
  pendingComponent: LeadsAuthedSkeleton,
  component: InvestorsRoute,
});

function InvestorsRoute() {
  const { data, currentPage, totalPages, totalCount } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Investors</h1>
        <Button asChild size="sm">
          <Link to="/investors/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Investor
          </Link>
        </Button>
      </div>

      <InvestorContainer
        data={data}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </section>
  );
}
