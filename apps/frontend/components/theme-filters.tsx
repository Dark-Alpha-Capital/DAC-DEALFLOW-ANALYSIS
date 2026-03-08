"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { Loader2, SearchIcon, XCircleIcon } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SearchThemes() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("query")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("query", query);
        params.set("page", "1");
      } else {
        params.delete("query");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  const handleClearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      handleSearch("");
    }
  };

  return (
    <div
      className="relative flex h-10 w-full items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching ? (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-2 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        placeholder="Search name, description, sector..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={q}
        onKeyDown={(e) => {
          if (e.key === "Escape") inputRef?.current?.blur();
        }}
        ref={inputRef}
      />
      {q && (
        <Button
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={handleClearInput}
          variant="ghost"
          size="icon"
        >
          <XCircleIcon className="size-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

export function SearchSectorThemes() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("sector")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("sector", query);
        params.set("page", "1");
      } else {
        params.delete("sector");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  const handleClearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      handleSearch("");
    }
  };

  return (
    <div
      className="relative flex h-10 w-full items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching ? (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-2 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        placeholder="Filter by sector..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={q}
        onKeyDown={(e) => {
          if (e.key === "Escape") inputRef?.current?.blur();
        }}
        ref={inputRef}
      />
      {q && (
        <Button
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={handleClearInput}
          variant="ghost"
          size="icon"
        >
          <XCircleIcon className="size-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

export function SearchStatusThemes() {
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

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status || "all"}
        onValueChange={handleStatusChange}
        disabled={isSearching}
      >
        <SelectTrigger className="h-10 w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Theme Status</SelectLabel>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="RETIRED">Retired</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function SearchCapitalPriorityThemes() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const minVal = searchParams.get("minCapitalPriority")?.toString() ?? "";
  const maxVal = searchParams.get("maxCapitalPriority")?.toString() ?? "";

  const handleMinChange = useDebouncedCallback((val: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (val && /^\d+$/.test(val)) {
        params.set("minCapitalPriority", val);
      } else {
        params.delete("minCapitalPriority");
      }
      params.set("page", "1");
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  const handleMaxChange = useDebouncedCallback((val: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (val && /^\d+$/.test(val)) {
        params.set("maxCapitalPriority", val);
      } else {
        params.delete("maxCapitalPriority");
      }
      params.set("page", "1");
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  return (
    <div
      className="flex items-center gap-2"
      data-pending={isSearching ? "" : undefined}
    >
      <Input
        ref={inputRef}
        type="number"
        min={1}
        max={100}
        placeholder="Min (1-100)"
        className="h-10 w-24"
        defaultValue={minVal}
        onChange={(e) => handleMinChange(e.target.value)}
      />
      <span className="text-muted-foreground text-sm">–</span>
      <Input
        type="number"
        min={1}
        max={100}
        placeholder="Max (1-100)"
        className="h-10 w-24"
        defaultValue={maxVal}
        onChange={(e) => handleMaxChange(e.target.value)}
      />
    </div>
  );
}

export function SearchConfidenceThemes() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const minVal = searchParams.get("minConfidence")?.toString() ?? "";
  const maxVal = searchParams.get("maxConfidence")?.toString() ?? "";

  const handleMinChange = useDebouncedCallback((val: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (val && /^\d+$/.test(val)) {
        params.set("minConfidence", val);
      } else {
        params.delete("minConfidence");
      }
      params.set("page", "1");
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  const handleMaxChange = useDebouncedCallback((val: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (val && /^\d+$/.test(val)) {
        params.set("maxConfidence", val);
      } else {
        params.delete("maxConfidence");
      }
      params.set("page", "1");
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  return (
    <div
      className="flex items-center gap-2"
      data-pending={isSearching ? "" : undefined}
    >
      <Input
        type="number"
        min={1}
        max={100}
        placeholder="Min (1-100)"
        className="h-10 w-24"
        defaultValue={minVal}
        onChange={(e) => handleMinChange(e.target.value)}
      />
      <span className="text-muted-foreground text-sm">–</span>
      <Input
        type="number"
        min={1}
        max={100}
        placeholder="Max (1-100)"
        className="h-10 w-24"
        defaultValue={maxVal}
        onChange={(e) => handleMaxChange(e.target.value)}
      />
    </div>
  );
}
