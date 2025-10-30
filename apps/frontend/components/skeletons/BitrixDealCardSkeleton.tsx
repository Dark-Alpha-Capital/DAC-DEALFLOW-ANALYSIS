import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BitrixDealCardSkeletonProps {
  className?: string;
}

export function BitrixDealCardSkeleton({
  className,
}: BitrixDealCardSkeletonProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm",
        className,
      )}
    >
      <div className="p-5">
        {/* Title skeleton */}
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="mb-4 h-6 w-1/2" />

        <div className="space-y-3">
          {/* Revenue skeleton */}
          <div className="flex items-center">
            <Skeleton className="mr-2 h-4 w-4 rounded-full" />
            <div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-1 h-5 w-24" />
            </div>
          </div>

          {/* Location skeleton */}
          <div className="flex items-center">
            <Skeleton className="mr-2 h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
