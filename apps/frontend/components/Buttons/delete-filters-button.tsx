"use client";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useTransition } from "react";

const DeleteFiltersButton = () => {
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClearFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      // Clear all filter parameters
      params.delete("status");
      params.delete("query");
      params.delete("brokerage");
      params.delete("industry");

      params.delete("dealType");
      params.delete("published");
      params.delete("tags");
      params.delete("tag");
      params.delete("ebitda");
      params.delete("maxEbitda");
      params.delete("revenue");
      params.delete("maxRevenue");
      params.delete("reviewed");
      params.delete("seen");
      params.delete("page");

      // Navigate to the clean URL
      router.push(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleClearFilters}
      disabled={isPending}
      className="gap-2"
    >
      <XIcon className="h-4 w-4" />
      {isPending ? "Deleting..." : "Delete Filters"}
    </Button>
  );
};

export default DeleteFiltersButton;
