"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useRef, useTransition, useState } from "react";

import { Loader2, SearchIcon, XCircleIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SearchMaxRevenueDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("maxRevenue") || ""),
  );

  const q = searchParams.get("maxRevenue")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("maxRevenue", query);
        params.set("page", "1");
      } else {
        params.delete("maxRevenue");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  // US-style number formatting
  function formatNumberWithCommas(x: string) {
    if (!x) return "";
    // Remove all non-digit characters (except dot for decimals)
    const parts = x.replace(/,/g, "").split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  // Remove commas for search
  function unformatNumber(x: string) {
    return x.replace(/,/g, "");
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    // Only allow numbers (and optional decimal)
    if (!/^\d*\.?\d*$/.test(rawValue)) return;
    setInputValue(formatNumberWithCommas(rawValue));
    handleSearch(rawValue);
  };

  const handleClearInput = () => {
    setInputValue("");
    handleSearch("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      className="relative mx-auto flex h-10 w-full max-w-xs items-center sm:max-w-sm md:max-w-xs lg:max-w-xs xl:max-w-xs"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching ? (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-2 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        type="text"
        placeholder="Enter Max Revenue"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            inputRef?.current?.blur();
          }
        }}
        ref={inputRef}
      />
      {q && (
        <Button
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={handleClearInput}
          variant={"ghost"}
          size={"icon"}
        >
          <XCircleIcon className="size-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
