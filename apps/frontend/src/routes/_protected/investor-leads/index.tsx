import { createFileRoute, Link } from "@tanstack/react-router";
import InvestorLeadContainer from "@/components/InvestorLeadContainer";
import { loadInvestorLeadsPageData } from "@/lib/server/investor-leads-route-data";
import InvestorLeadsAuthedSkeleton from "@/components/skeletons/InvestorLeadsAuthedSkeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

export const Route = createFileRoute("/_protected/investor-leads/")({
  validateSearch: (search: Record<string, unknown>): LooseSearch =>
    looseValidateSearch(search),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => paginatedListLoaderDeps(search),
  head: () => ({
    meta: [{ title: "Investor Leads — Dark Alpha Capital" }],
  }),
  loader: async ({ location }) => {
    const search = location.search as LooseSearch;
    const currentPage = Math.max(1, asNumber(search.page, 1));
    const limit = Math.max(1, asNumber(search.limit, 25));
    const offset = (currentPage - 1) * limit;
    const page = await loadInvestorLeadsPageData({ data: { offset, limit } });
    return { ...page, currentPage };
  },
  pendingComponent: InvestorLeadsAuthedSkeleton,
  component: InvestorLeadsRoute,
});

function InvestorLeadsRoute() {
  const { data, currentPage, totalPages, totalCount } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Investor Leads</h1>
        <Button asChild size="sm">
          <Link to="/investor-leads/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Investor Lead
          </Link>
        </Button>
      </div>

      <InvestorLeadContainer
        data={data}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </section>
  );
}
