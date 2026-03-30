import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const LoadingSkeleton = () => {
  return (
    <div className="big-container block-space space-y-6 p-6">
      {/* Heading Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" /> {/* Heading */}
        <Skeleton className="h-4 w-1/2" /> {/* Tagline */}
      </div>

      {/* Section 1 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" /> {/* Section Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Section 2 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" /> {/* Section Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Section 3 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" /> {/* Section Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Additional Sections */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" /> {/* Section Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
};

export default LoadingSkeleton;
