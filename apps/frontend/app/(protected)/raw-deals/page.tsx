import React, { Suspense } from "react";
import { Metadata } from "next";
import Pagination from "@/components/pagination";
import DealTypeFilter from "@/components/DealTypeFilter";
import { DealStatus, DealType } from "db/schema";
import SearchDealsSkeleton from "@/components/skeletons/SearchDealsSkeleton";
import DealTypeFilterSkeleton from "@/components/skeletons/DealTypeFilterSkeleton";
import UserDealFilter from "@/components/UserDealFilter";
import DealContainer from "@/components/DealContainer";
import DeleteFiltersButton from "@/components/Buttons/delete-filters-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SearchDeals,
  SearchBrokerageDeals,
  SearchIndustryDeals,
  SearchEbitdaMarginFilter,
  SearchEbitdaDeals,
  SearchRevenueDeals,
  SearchMaxRevenueDeals,
  SearchLocationDeals,
  SearchSeenDeals,
  SearchRecentDeals,
  SearchReviewedDeals,
  SearchPublishedDeals,
  SearchMaxEbitdaDeals,
  SearchStatusDeals,
  SearchTagsDeals,
} from "@/components/raw-deals-filters";
import { GetAllDeals } from "db/queries";
import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Raw Deals",
  description: "View the raw deals",
};

type SearchParams = Promise<{ [key: string]: string | undefined }>;

const RawDealsPage = async (props: { searchParams: SearchParams }) => {
  return (
    <section className="block-space group container">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold md:mb-6 lg:mb-8">Raw Deals</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Browse through our collection of unprocessed deals gathered from
          various sources including manual entries, bulk uploads, external
          website scraping, and AI-inferred opportunities.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
            <Suspense fallback={<DealTypeFilterSkeleton />}>
              <DealTypeFilter />
            </Suspense>
            <Suspense fallback={<DealTypeFilterSkeleton />}>
              <UserDealFilter />
            </Suspense>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Refine results by source, metrics, status, and tags. Most
                filters update results as you type.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <DeleteFiltersButton />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion
              type="multiple"
              defaultValue={["search", "financials", "status-tags", "flags"]}
              className="w-full"
            >
              <AccordionItem value="search">
                <AccordionTrigger>Search</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchBrokerageDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchIndustryDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchLocationDeals />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financials">
                <AccordionTrigger>Financials</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchRevenueDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMaxRevenueDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchEbitdaDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchMaxEbitdaDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchEbitdaMarginFilter />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="status-tags">
                <AccordionTrigger>Status &amp; Tags</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchStatusDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchTagsDeals />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="flags">
                <AccordionTrigger>Visibility</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchSeenDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchRecentDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchReviewedDeals />
                    </Suspense>
                    <Suspense fallback={<SearchDealsSkeleton />}>
                      <SearchPublishedDeals />
                    </Suspense>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
      <Suspense fallback={<div>Loading deals...</div>}>
        <ShowDealsComponent searchParams={props.searchParams} />
      </Suspense>
    </section>
  );
};

export default RawDealsPage;

async function ShowDealsComponent(props: { searchParams: SearchParams }) {
  const userSession = await getSession();
  if (!userSession?.user) {
    redirect("/auth/login");
  }

  const searchParams = await props.searchParams;
  const search = searchParams?.query || "";
  const revenue = searchParams?.revenue || "";
  const location = searchParams?.location || "";
  const maxRevenue = searchParams?.maxRevenue || "";
  const maxEbitda = searchParams?.maxEbitda || "";
  const brokerage = searchParams?.brokerage || "";
  const industry = searchParams?.industry || "";
  const ebitdaMargin = searchParams?.ebitdaMargin || "";
  const currentPage = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 50;
  const offset = (currentPage - 1) * limit;
  const ebitda = searchParams?.ebitda || "";
  const userId = searchParams?.userId || "";
  const showSeen = searchParams?.seen === "true" ? true : false;
  const showRecent = searchParams?.recent === "true" ? true : false;
  const showReviewed = searchParams?.reviewed === "true" ? true : false;
  const showPublished = searchParams?.published === "true" ? true : false;

  const status = searchParams?.status || "";

  const dealTypes =
    typeof searchParams?.dealType === "string"
      ? [searchParams.dealType]
      : searchParams?.dealType || [];

  const tags =
    typeof searchParams?.tags === "string"
      ? [searchParams.tags]
      : searchParams?.tags || [];

  return (
    <div>
      <FetchAndDisplayDeals
        search={search}
        offset={offset}
        limit={limit}
        dealTypes={dealTypes as DealType[]}
        ebitda={ebitda}
        userId={userId}
        currentPage={currentPage}
        revenue={revenue}
        location={location}
        maxRevenue={maxRevenue}
        maxEbitda={maxEbitda}
        brokerage={brokerage}
        industry={industry}
        ebitdaMargin={ebitdaMargin}
        showSeen={showSeen}
        showRecent={showRecent}
        showReviewed={showReviewed}
        showPublished={showPublished}
        status={status as DealStatus}
        tags={tags as string[]}
      />
    </div>
  );
}

async function FetchAndDisplayDeals({
  search,
  offset,
  limit,
  dealTypes,
  ebitda,
  userId,
  currentPage,
  revenue,
  location,
  maxRevenue,
  maxEbitda,
  brokerage,
  industry,
  ebitdaMargin,
  showSeen,
  showRecent,
  showReviewed,
  showPublished,
  status,
  tags,
}: {
  search: string;
  offset: number;
  limit: number;
  dealTypes: DealType[];
  ebitda: string;
  userId: string;
  currentPage: number;
  revenue: string;
  location: string;
  maxRevenue: string;
  maxEbitda: string;
  brokerage: string;
  industry: string;
  ebitdaMargin: string;
  showSeen: boolean;
  showRecent: boolean;
  showReviewed: boolean;
  showPublished: boolean;
  status: DealStatus;
  tags: string[];
}) {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");

  const { data, totalPages, totalCount } = await GetAllDeals({
    search,
    offset,
    limit,
    dealTypes: dealTypes as DealType[],
    ebitda,
    userId,
    revenue,
    location,
    maxRevenue,
    maxEbitda,
    brokerage,
    industry,
    ebitdaMargin,
    showSeen,
    showRecent,
    showReviewed,
    showPublished,
    status: status as DealStatus,
    tags: tags as string[],
  });

  return (
    <div>
      <div className="group-has-[[data-pending]]:animate-pulse">
        {data.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-xl text-muted-foreground">
              No deals found matching your criteria.
            </p>
          </div>
        ) : (
          <DealContainer
            data={data}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        )}
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
