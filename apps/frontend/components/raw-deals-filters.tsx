"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition, useState, useOptimistic } from "react";
import {
  Loader2,
  SearchIcon,
  XCircleIcon,
  EyeIcon,
  EyeOffIcon,
  ClockIcon,
  HistoryIcon,
  ListIcon,
  Tag,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumberWithCommas } from "@/lib/utils";

// SearchDeals Component
export function SearchDeals() {
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
        placeholder="Search using deal caption..."
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={q}
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

// SearchBrokerageDeals Component
export function SearchBrokerageDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("brokerage")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("brokerage", query);
        params.set("page", "1");
      } else {
        params.delete("brokerage");
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
        <Loader2 className="absolute left-2 top-3 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        placeholder="Search using brokerage..."
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={q}
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

// SearchIndustryDeals Component
export function SearchIndustryDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("industry")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("industry", query);
        params.set("page", "1");
      } else {
        params.delete("industry");
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
        <Loader2 className="absolute left-2 top-3 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        placeholder="Search using industry..."
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={q}
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

// SearchEbitdaMarginFilter Component
export function SearchEbitdaMarginFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("ebitdaMargin") || ""),
  );

  const q = searchParams.get("ebitdaMargin")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("ebitdaMargin", query);
        params.set("page", "1");
      } else {
        params.delete("ebitdaMargin");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

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
      className="relative flex h-10 w-full items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching ? (
        <Loader2 className="absolute left-2 top-3 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        type="text"
        placeholder="Enter Min EBITDA Margin"
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

// SearchEbitdaDeals Component
export function SearchEbitdaDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("ebitda") || ""),
  );

  const q = searchParams.get("ebitda")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("ebitda", query);
        params.set("page", "1");
      } else {
        params.delete("ebitda");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

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
        type="text"
        placeholder="Enter Min EBITDA"
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

// SearchRevenueDeals Component
export function SearchRevenueDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("revenue") || ""),
  );

  const q = searchParams.get("revenue")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("revenue", query);
        params.set("page", "1");
      } else {
        params.delete("revenue");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

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
      className="relative flex h-10 w-full items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching ? (
        <Loader2 className="absolute left-2 top-3 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        type="text"
        placeholder="Enter Min Revenue"
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

// SearchMaxRevenueDeals Component
export function SearchMaxRevenueDeals() {
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

// SearchLocationDeals Component
export function SearchLocationDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("location")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("location", query);
        params.set("page", "1");
      } else {
        params.delete("location");
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
        type="text"
        placeholder="Enter Location value"
        onChange={(e) => {
          handleSearch(e.target.value);
        }}
        defaultValue={q}
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

// SearchSeenDeals Component
export function SearchSeenDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const seen = searchParams.get("seen") === "true";

  const handleToggle = () => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (!seen) {
        params.set("seen", "true");
        params.set("page", "1");
      } else {
        params.delete("seen");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div
      className="relative flex items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching && (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      )}
      <Button
        className="h-9 px-3"
        variant={seen ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isSearching}
      >
        {seen ? (
          <EyeIcon className="mr-2 size-4" />
        ) : (
          <EyeOffIcon className="mr-2 size-4" />
        )}
        Seen
      </Button>
    </div>
  );
}

// SearchRecentDeals Component
export function SearchRecentDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const recent = searchParams.get("recent") === "true";

  const handleToggle = () => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (!recent) {
        params.set("recent", "true");
        params.set("page", "1");
      } else {
        params.delete("recent");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div
      className="relative flex items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching && (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      )}
      <Button
        className="h-9 px-3"
        variant={recent ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isSearching}
      >
        {recent ? (
          <HistoryIcon className="mr-2 size-4" />
        ) : (
          <ListIcon className="mr-2 size-4" />
        )}
        Recent
      </Button>
    </div>
  );
}

// SearchReviewedDeals Component
export function SearchReviewedDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const reviewed = searchParams.get("reviewed") === "true";

  const handleToggle = () => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (!reviewed) {
        params.set("reviewed", "true");
        params.set("page", "1");
      } else {
        params.delete("reviewed");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div
      className="relative flex items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching && (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      )}
      <Button
        className="h-9 px-3"
        variant={reviewed ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isSearching}
      >
        {reviewed ? (
          <EyeIcon className="mr-2 size-4" />
        ) : (
          <EyeOffIcon className="mr-2 size-4" />
        )}
        Reviewed
      </Button>
    </div>
  );
}

// SearchPublishedDeals Component
export function SearchPublishedDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const published = searchParams.get("published") === "true";

  const handleToggle = () => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (!published) {
        params.set("published", "true");
        params.set("page", "1");
      } else {
        params.delete("published");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div
      className="relative flex items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching && (
        <Loader2 className="absolute left-2 top-2 size-4 animate-spin text-muted-foreground" />
      )}
      <Button
        className="h-9 px-3"
        variant={published ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isSearching}
      >
        {published ? (
          <EyeIcon className="mr-2 size-4" />
        ) : (
          <EyeOffIcon className="mr-2 size-4" />
        )}
        Published
      </Button>
    </div>
  );
}

// SearchMaxEbitdaDeals Component
export function SearchMaxEbitdaDeals() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("maxEbitda") || ""),
  );

  const q = searchParams.get("maxEbitda")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("maxEbitda", query);
        params.set("page", "1");
      } else {
        params.delete("maxEbitda");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

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
      className="relative flex h-10 w-full items-center"
      data-pending={isSearching ? "" : undefined}
    >
      {isSearching ? (
        <Loader2 className="absolute left-2 top-3 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        type="text"
        placeholder="Enter Max EBITDA"
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

// SearchStatusDeals Component
export function SearchStatusDeals() {
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
      <Button
        onClick={handleStatusToggle}
        disabled={isSearching}
        variant="outline"
        size="sm"
      >
        Clear
      </Button>

      <Select
        value={status || "NOT_SPECIFIED"}
        onValueChange={handleStatusChange}
        disabled={isSearching}
      >
        <SelectTrigger className="h-10 w-[220px]">
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

// SearchTagsDeals Component
export function SearchTagsDeals() {
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
          <Button variant="outline" size="sm" className="h-9">
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
}
