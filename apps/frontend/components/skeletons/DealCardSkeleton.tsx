import React from "react";
import { Skeleton } from "../ui/skeleton";

const DealCardSkeleton = () => {
  return (
    <div className="p-4 border rounded-md shadow-md w-full max-w-sm mx-auto">
      {/* Placeholder for image */}
      <Skeleton className="w-full h-48 mb-4" />

      {/* Placeholder for title */}
      <Skeleton className="h-6 w-3/4 mb-4" />

      {/* Placeholder for revenue */}
      <Skeleton className="h-4 w-1/2 mb-2" />

      {/* Placeholder for description */}
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-4/6" />

      {/* Placeholder for buttons */}
      <div className="flex justify-between mt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
};

export default DealCardSkeleton;
