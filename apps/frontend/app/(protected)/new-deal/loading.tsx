import React from "react";
import { Skeleton } from "@/components/ui/skeleton"; // Adjust the path based on your file structure

const LoadingSkeleton = () => {
  return (
    <div className="narrow-container block-space space-y-4">
      <div className="text-center mb-4">
        {/* Heading Skeleton */}
        <Skeleton className="w-1/2 h-8 mb-4" />

        {/* Tagline Skeleton */}
        <Skeleton className="w-1/3 h-6 mb-8" />
      </div>
      {/* Main Sections */}
      <div className="grid grid-cols-1  md:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-8 lg:mt-12">
        {/* First Section */}
        <div className="space-y-4">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
        </div>

        {/* Second Section - Form Fields */}
        <div className="space-y-4">
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-10" />
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
