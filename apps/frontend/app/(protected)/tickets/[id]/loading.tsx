"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetailLoading() {
  return (
    <div className="big-container block-space min-h-screen animate-pulse">
      {/* Title placeholder */}
      <Skeleton className="h-8 w-48 rounded-md mb-4" />

      {/* Ticket detail placeholders */}
      <div className="grid gap-3 max-w-3xl">
        <Skeleton className="h-6 w-full rounded-md" />
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-6 w-1/2 rounded-md" />
        <Skeleton className="h-6 w-2/3 rounded-md" />
        <Skeleton className="h-6 w-5/6 rounded-md" />
      </div>
    </div>
  );
}
