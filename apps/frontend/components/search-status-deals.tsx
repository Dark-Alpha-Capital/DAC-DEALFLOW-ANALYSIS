"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "./ui/button";

export default function SearchStatusDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const status = searchParams.get("status");

  const handleStatusChange = (value: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all") {
        params.set("status", value);
      } else {
        params.delete("status");
      }
      params.set("page", "1");
      replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleStatusToggle = () => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      params.delete("status");
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleStatusToggle} disabled={isSearching}>
        Toggle
      </Button>

      <Select
        value={status || "NOT_SPECIFIED"}
        onValueChange={handleStatusChange}
        disabled={isSearching}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Filter Deal Status</SelectLabel>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
            <SelectItem value="UNDER_CONTRACT">Under Contract</SelectItem>
            <SelectItem value="NOT_SPECIFIED">Not Specified</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
