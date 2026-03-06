import DealTypeFilterSkeleton from "./DealTypeFilterSkeleton";
import SearchDealsSkeleton from "./SearchDealsSkeleton";
import DealCardGridSkeleton from "./DealCardGridSkeleton";

export default function RawDealsAuthedSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
          <DealTypeFilterSkeleton />
          <DealTypeFilterSkeleton />
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-20 rounded bg-muted" />
            <div className="h-4 w-80 max-w-full rounded bg-muted" />
          </div>
          <div className="h-9 w-36 rounded bg-muted" />
        </div>

        <div className="space-y-8 px-6 pb-6">
          <div className="space-y-3">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
              <SearchDealsSkeleton />
              <SearchDealsSkeleton />
            </div>
          </div>
        </div>
      </div>

      <DealCardGridSkeleton />
    </div>
  );
}
