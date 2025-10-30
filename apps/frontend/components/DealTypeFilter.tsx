"use client";

import React, { useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";

const DealTypeFilter = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDealTypes, setSelectedDealTypes] = useOptimistic(
    searchParams.getAll("dealType"),
  );

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("dealType");

      const newSelectedTypes = checked
        ? [...selectedDealTypes, value]
        : selectedDealTypes.filter((type) => type !== value);

      newSelectedTypes.forEach((type) => params.append("dealType", type));
      setSelectedDealTypes(newSelectedTypes);

      router.push(`?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  return (
    <div
      className="flex items-center gap-2"
      data-pending={isPending ? "" : undefined}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Deal Type
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Deal Type</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuCheckboxItem
            checked={selectedDealTypes.includes("MANUAL")}
            onCheckedChange={(checked) =>
              handleCheckedChange("MANUAL", checked)
            }
          >
            Manual
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedDealTypes.includes("SCRAPED")}
            onCheckedChange={(checked) =>
              handleCheckedChange("SCRAPED", checked)
            }
          >
            Scraped
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={selectedDealTypes.includes("AI_INFERRED")}
            onCheckedChange={(checked) =>
              handleCheckedChange("AI_INFERRED", checked)
            }
          >
            AI Inferred
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DealTypeFilter;
