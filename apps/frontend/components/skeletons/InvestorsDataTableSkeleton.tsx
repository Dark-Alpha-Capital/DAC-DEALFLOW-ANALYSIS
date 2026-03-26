import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 10;

export default function InvestorsDataTableSkeleton() {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
        <Skeleton className="h-10 w-full sm:max-w-sm" />
        <Skeleton className="h-10 w-full sm:w-36" />
      </div>
      <div className="bg-card overflow-x-auto rounded-lg border">
        <div className="min-w-[30rem]">
          <div className="border-b bg-muted/30">
            <div className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 flex-2" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: ROWS }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3"
              >
                <Skeleton className="h-4 flex-2" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Skeleton className="h-9 w-56" />
      </div>
    </div>
  );
}
