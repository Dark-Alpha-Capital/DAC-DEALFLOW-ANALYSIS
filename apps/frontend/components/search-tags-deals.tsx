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
import { Tag } from "lucide-react";

const SearchTagsDeals = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useOptimistic(
    searchParams.getAll("tags"),
  );

  // Define available tags
  const availableTags = [
    { value: "Technology", label: "Technology" },
    { value: "Healthcare", label: "Healthcare" },
    { value: "Manufacturing", label: "Manufacturing" },
    { value: "Retail", label: "Retail" },
    { value: "Finance", label: "Finance" },
    { value: "Real Estate", label: "Real Estate" },
    { value: "Food & Beverage", label: "Food & Beverage" },
    { value: "Transportation", label: "Transportation" },
    { value: "Energy", label: "Energy" },
    { value: "Education", label: "Education" },
    { value: "Consulting", label: "Consulting" },
    { value: "Construction", label: "Construction" },
    { value: "Automotive", label: "Automotive" },
    { value: "Media", label: "Media" },
  ];

  const handleCheckedChange = (value: string, checked: boolean) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("tags");

      const newSelectedTags = checked
        ? [...selectedTags, value]
        : selectedTags.filter((tag) => tag !== value);

      newSelectedTags.forEach((tag) => params.append("tags", tag));
      setSelectedTags(newSelectedTags);

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
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {availableTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.value}
              checked={selectedTags.includes(tag.value)}
              onCheckedChange={(checked) =>
                handleCheckedChange(tag.value, checked)
              }
            >
              {tag.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SearchTagsDeals;
