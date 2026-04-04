import { createFileRoute, Link } from "@tanstack/react-router";
import CompanyContainer from "@/components/CompanyContainer";
import { loadCompaniesPageData } from "@/lib/server/company-route-data";
import CompaniesAuthedSkeleton from "@/components/skeletons/CompaniesAuthedSkeleton";
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

export const Route = createFileRoute("/_protected/companies/")({
  validateSearch: (search: Record<string, unknown>): LooseSearch =>
    looseValidateSearch(search),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => paginatedListLoaderDeps(search),
  head: () => ({
    meta: [{ title: "Companies — Dark Alpha Capital" }],
  }),
  loader: async ({ location }) => {
    const search = location.search as LooseSearch;
    const currentPage = Math.max(1, asNumber(search.page, 1));
    const limit = Math.max(1, asNumber(search.limit, 25));
    const offset = (currentPage - 1) * limit;
    const page = await loadCompaniesPageData({ data: { offset, limit } });
    return { ...page, currentPage };
  },
  pendingComponent: CompaniesAuthedSkeleton,
  component: CompaniesRoute,
});

function CompaniesRoute() {
  const { data, currentPage, totalPages, totalCount } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Companies</h1>
        <Button asChild size="sm">
          <Link to="/companies/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Link>
        </Button>
      </div>

      <CompanyContainer
        data={data}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </section>
  );
}
