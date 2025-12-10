"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function TicketsLoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="space-y-3">
            {/* Title placeholder */}
            <Skeleton className="h-5 w-3/4 rounded-md" />

            {/* Details placeholders */}
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <Skeleton className="h-4 w-1/3 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
