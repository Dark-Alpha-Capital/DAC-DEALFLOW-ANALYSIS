import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { GetAllThemes } from "@repo/db/queries";
import ThemeContainer from "@/components/ThemeContainer";
import ThemesAuthedSkeleton from "@/components/skeletons/ThemesAuthedSkeleton";
import ThemeCardGridSkeleton from "@/components/skeletons/ThemeCardGridSkeleton";
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

export const metadata: Metadata = {
  title: "Investment Themes",
  description: "View all investment themes",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DEFAULT_OPEN_FILTER_SECTIONS = ["search", "scores"];

function asString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : value?.[0];
}

function asNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(asString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

const ThemesPage = (props: { searchParams: SearchParams }) => {
  const sessionPromise = getSession();
  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-4xl font-bold md:text-5xl">Investment Themes</h1>
        <Button asChild size="sm">
          <Link href="/investment-themes/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Add investment theme
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ThemesAuthedSkeleton />}>
        <AuthedThemes
          searchParams={props.searchParams}
          sessionPromise={sessionPromise}
        />
      </Suspense>
    </section>
  );
};

export default ThemesPage;

async function AuthedThemes(props: {
  searchParams: SearchParams;
  sessionPromise: ReturnType<typeof getSession>;
}) {
  const [resolvedSearchParams, userSession] = await Promise.all([
    props.searchParams,
    props.sessionPromise,
  ]);
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  return (
    <>
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

      <Suspense fallback={<ThemeCardGridSkeleton />}>
        <ShowThemesComponent searchParams={resolvedSearchParams} />
      </Suspense>
    </>
  );
}

async function ShowThemesComponent(props: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const searchParams = props.searchParams;
  const currentPage = Math.max(1, asNumber(searchParams.page, 1));
  const limit = Math.max(1, asNumber(searchParams.limit, 25));
  const offset = (currentPage - 1) * limit;
  const search = asString(searchParams.query) ?? "";
  const sector = asString(searchParams.sector) ?? "";
  const status = asString(searchParams.status) ?? "";
  const minCapitalPriority = asNumber(searchParams.minCapitalPriority, NaN);
  const maxCapitalPriority = asNumber(searchParams.maxCapitalPriority, NaN);
  const minConfidence = asNumber(searchParams.minConfidence, NaN);
  const maxConfidence = asNumber(searchParams.maxConfidence, NaN);

  return (
    <FetchAndDisplayThemes
      offset={offset}
      limit={limit}
      currentPage={currentPage}
      search={search}
      sector={sector}
      status={
        status && ["ACTIVE", "PAUSED", "RETIRED"].includes(status)
          ? (status as "ACTIVE" | "PAUSED" | "RETIRED")
          : undefined
      }
      minCapitalPriorityScore={
        Number.isFinite(minCapitalPriority) ? minCapitalPriority : undefined
      }
      maxCapitalPriorityScore={
        Number.isFinite(maxCapitalPriority) ? maxCapitalPriority : undefined
      }
      minConfidenceScore={
        Number.isFinite(minConfidence) ? minConfidence : undefined
      }
      maxConfidenceScore={
        Number.isFinite(maxConfidence) ? maxConfidence : undefined
      }
    />
  );
}

async function FetchAndDisplayThemes({
  offset,
  limit,
  currentPage,
  search,
  sector,
  status,
  minCapitalPriorityScore,
  maxCapitalPriorityScore,
  minConfidenceScore,
  maxConfidenceScore,
}: {
  offset: number;
  limit: number;
  currentPage: number;
  search: string;
  sector: string;
  status?: "ACTIVE" | "PAUSED" | "RETIRED";
  minCapitalPriorityScore?: number;
  maxCapitalPriorityScore?: number;
  minConfidenceScore?: number;
  maxConfidenceScore?: number;
}) {
  "use cache";
  cacheTag("themes");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllThemes({
    offset,
    limit,
    search,
    sector,
    status,
    minCapitalPriorityScore,
    maxCapitalPriorityScore,
    minConfidenceScore,
    maxConfidenceScore,
  });

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
