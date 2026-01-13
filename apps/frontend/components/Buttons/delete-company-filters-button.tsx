"use client";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useTransition } from "react";

const DeleteCompanyFiltersButton = () => {
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClearFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      // Clear all filter parameters
      params.delete("search");
      params.delete("sector");
      params.delete("headquarters");
      params.delete("minRevenue");
      params.delete("maxRevenue");
      params.delete("minEbitda");
      params.delete("maxEbitda");
      params.delete("minEmployees");
      params.delete("maxEmployees");
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
      {isPending ? "Clearing..." : "Clear Filters"}
    </Button>
  );
};

export default DeleteCompanyFiltersButton;
