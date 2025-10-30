import React from "react";
import { Skeleton } from "../ui/skeleton";

const DealTypeFilterSkeleton = () => {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
};

export default DealTypeFilterSkeleton;
