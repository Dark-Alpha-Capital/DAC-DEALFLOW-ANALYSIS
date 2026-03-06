import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DealCardSkeleton = () => {
  return (
    <div className="w-full rounded-xl border bg-background p-6 shadow transition-all duration-300">
      <div className="flex flex-col space-y-1.5 pb-3">
        <div className="flex items-center justify-between">
          {/* Title skeleton */}
          <Skeleton className="h-6 w-3/4" />
          {/* Action buttons skeleton */}
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 pt-0">
        <div className="space-y-3">
          {/* Brokerage InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-20" />
            <Skeleton className="ml-1 h-4 w-24" />
          </div>

          {/* Status InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-16" />
            <Skeleton className="ml-1 h-4 w-20" />
          </div>

          {/* Published InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="ml-2 h-4 w-20" />
            <Skeleton className="ml-1 h-4 w-12" />
          </div>

          {/* Reviewed InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="ml-2 h-4 w-20" />
            <Skeleton className="ml-1 h-4 w-12" />
          </div>

          {/* Revenue InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-16" />
            <Skeleton className="ml-1 h-4 w-28" />
          </div>

          {/* DealType InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-20" />
            <Skeleton className="ml-1 h-4 w-24" />
          </div>

          {/* EBITDA InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-16" />
            <Skeleton className="ml-1 h-4 w-28" />
          </div>

          {/* EBITDA Margin InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-24" />
            <Skeleton className="ml-1 h-4 w-16" />
          </div>

          {/* Industry InfoItem skeleton */}
          <div className="flex items-center text-sm">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="ml-2 h-4 w-20" />
            <Skeleton className="ml-1 h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-3">
        {/* View Details button skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />
        {/* Screen Deal button skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
};

export default function DealCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <DealCardSkeleton key={index} />
      ))}
    </div>
  );
}
