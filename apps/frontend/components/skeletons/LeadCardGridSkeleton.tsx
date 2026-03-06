import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const LeadCardSkeleton = () => (
  <div className="w-full rounded-xl border bg-background p-6 shadow transition-all duration-300">
    <div className="flex flex-col space-y-1.5 pb-3">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
    <div className="grid gap-3 pt-0">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
    <div className="flex gap-2 pt-3">
      <Skeleton className="h-9 flex-1 rounded-md" />
      <Skeleton className="h-9 flex-1 rounded-md" />
    </div>
  </div>
);

export default function LeadCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </div>
  );
}
