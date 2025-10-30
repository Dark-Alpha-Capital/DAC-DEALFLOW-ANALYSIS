import React from "react";

import { Skeleton } from "@/components/ui/skeleton";

const SearchDealsSkeleton = () => {
  return (
    <div className="relative flex h-8 items-center">
      <div className="absolute left-2 top-2 z-10">
        <Skeleton className="size-4 rounded-full" />
      </div>
      <Skeleton className="h-8 w-[160px] lg:w-[250px]" />
    </div>
  );
};

export default SearchDealsSkeleton;
