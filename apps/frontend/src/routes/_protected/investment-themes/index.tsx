import { createFileRoute, Link } from "@tanstack/react-router";
import ThemeContainer from "@/components/ThemeContainer";
import { loadInvestmentThemesPageData } from "@/lib/server/investment-themes-route-data";
import ThemesAuthedSkeleton from "@/components/skeletons/ThemesAuthedSkeleton";
import type { Theme } from "@repo/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SearchThemes,
  SearchSectorThemes,
  SearchStatusThemes,
  SearchCapitalPriorityThemes,
  SearchConfidenceThemes,
} from "@/components/theme-filters";
import DeleteThemeFiltersButton from "@/components/Buttons/delete-theme-filters-button";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import {
  asNumber,
  asString,
  investmentThemesListLoaderDeps,
  looseValidateSearch,
  type LooseSearch,
} from "@/lib/route-search";

const DEFAULT_OPEN_FILTER_SECTIONS = ["search", "scores"];

export const Route = createFileRoute("/_protected/investment-themes/")({
  validateSearch: (search: Record<string, unknown>): LooseSearch =>
    looseValidateSearch(search),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => investmentThemesListLoaderDeps(search),
  head: () => ({
    meta: [{ title: "Investment Themes — Dark Alpha Capital" }],
  }),
  loader: async ({ location }) => {
    const searchParams = location.search as LooseSearch;
    const currentPage = Math.max(1, asNumber(searchParams.page, 1));
    const limit = Math.max(1, asNumber(searchParams.limit, 25));
    const offset = (currentPage - 1) * limit;
    const search = asString(searchParams.query) ?? "";
    const sector = asString(searchParams.sector) ?? "";
    const statusRaw = asString(searchParams.status) ?? "";
    const minCapitalPriority = asNumber(searchParams.minCapitalPriority, NaN);
    const maxCapitalPriority = asNumber(searchParams.maxCapitalPriority, NaN);
    const minConfidence = asNumber(searchParams.minConfidence, NaN);
    const maxConfidence = asNumber(searchParams.maxConfidence, NaN);
    const status =
      statusRaw && ["ACTIVE", "PAUSED", "RETIRED"].includes(statusRaw)
        ? (statusRaw as "ACTIVE" | "PAUSED" | "RETIRED")
        : undefined;

    const page = await loadInvestmentThemesPageData({
      data: {
        offset,
        limit,
        search,
        sector,
        status,
        minCapitalPriorityScore: Number.isFinite(minCapitalPriority)
          ? minCapitalPriority
          : undefined,
        maxCapitalPriorityScore: Number.isFinite(maxCapitalPriority)
          ? maxCapitalPriority
          : undefined,
        minConfidenceScore: Number.isFinite(minConfidence)
          ? minConfidence
          : undefined,
        maxConfidenceScore: Number.isFinite(maxConfidence)
          ? maxConfidence
          : undefined,
      },
    });

    return { ...page, currentPage };
  },
  pendingComponent: ThemesAuthedSkeleton,
  component: InvestmentThemesRoute,
});

function InvestmentThemesRoute() {
  const { data, currentPage, totalPages, totalCount } = Route.useLoaderData();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Investment Themes</h1>
        <Button asChild size="sm">
          <Link to="/investment-themes/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add investment theme
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Filters</h2>
              <p className="text-muted-foreground text-sm">
                Refine investment themes by search, sector, status, and scores.
              </p>
            </div>
            <DeleteThemeFiltersButton />
          </div>
          <Accordion
            type="multiple"
            defaultValue={DEFAULT_OPEN_FILTER_SECTIONS}
            className="w-full"
          >
            <AccordionItem value="search">
              <AccordionTrigger>Search &amp; Filters</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SearchThemes />
                  <SearchSectorThemes />
                  <SearchStatusThemes />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scores">
              <AccordionTrigger>Scores</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-sm font-medium">
                      Capital Priority (1–100)
                    </span>
                    <SearchCapitalPriorityThemes />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-sm font-medium">
                      Confidence (1–100)
                    </span>
                    <SearchConfidenceThemes />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <ThemesGrid
        data={data}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </section>
  );
}

function ThemesGrid(props: {
  data: Theme[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const { data, currentPage, totalPages, totalCount } = props;
  return (
    <div>
      <div className="group-has-[[data-pending]]:animate-pulse">
        {data.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-xl">
              No investment themes found matching your criteria.
            </p>
          </div>
        ) : (
          <ThemeContainer
            data={data}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        )}
      </div>
    </div>
  );
}
