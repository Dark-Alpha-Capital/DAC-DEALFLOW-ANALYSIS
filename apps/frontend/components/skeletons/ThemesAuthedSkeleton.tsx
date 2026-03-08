import ThemeCardGridSkeleton from "./ThemeCardGridSkeleton";
import SearchDealsSkeleton from "./SearchDealsSkeleton";

export default function ThemesAuthedSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-20 rounded bg-muted" />
            <div className="h-4 w-64 max-w-full rounded bg-muted" />
          </div>
          <div className="h-9 w-28 rounded bg-muted" />
        </div>
        <div className="mt-4 space-y-4">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SearchDealsSkeleton />
            <SearchDealsSkeleton />
            <SearchDealsSkeleton />
          </div>
        </div>
      </div>
      <ThemeCardGridSkeleton />
    </div>
  );
}
