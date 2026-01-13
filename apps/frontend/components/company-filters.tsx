"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition, useState } from "react";
import {
  Loader2,
  SearchIcon,
  XCircleIcon,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumberWithCommas } from "@/lib/utils";

// SearchCompanies Component - Main search by name
export function SearchCompanies() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("search")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("search", query);
        params.set("page", "1");
      } else {
        params.delete("search");
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
        placeholder="Search by company name..."
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

// SearchSector Component
export function SearchSector() {
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
        <Loader2 className="absolute left-2 top-3 size-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      )}
      <Input
        className="h-10 w-full rounded-md pl-8 pr-10 text-base"
        placeholder="Search by sector..."
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

// SearchHeadquarters Component
export function SearchHeadquarters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = searchParams.get("headquarters")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("headquarters", query);
        params.set("page", "1");
      } else {
        params.delete("headquarters");
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
        placeholder="Search by headquarters..."
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

// SearchMinRevenue Component
export function SearchMinRevenue() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("minRevenue") || ""),
  );

  const q = searchParams.get("minRevenue")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("minRevenue", query);
        params.set("page", "1");
      } else {
        params.delete("minRevenue");
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

// SearchMaxRevenue Component
export function SearchMaxRevenue() {
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

// SearchMinEbitda Component
export function SearchMinEbitda() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("minEbitda") || ""),
  );

  const q = searchParams.get("minEbitda")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("minEbitda", query);
        params.set("page", "1");
      } else {
        params.delete("minEbitda");
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

// SearchMaxEbitda Component
export function SearchMaxEbitda() {
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

// SearchMinEmployees Component
export function SearchMinEmployees() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("minEmployees") || ""),
  );

  const q = searchParams.get("minEmployees")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("minEmployees", query);
        params.set("page", "1");
      } else {
        params.delete("minEmployees");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    // Only allow numbers
    if (!/^\d*$/.test(rawValue)) return;
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
        placeholder="Enter Min Employees"
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

// SearchMaxEmployees Component
export function SearchMaxEmployees() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(
    formatNumberWithCommas(searchParams.get("maxEmployees") || ""),
  );

  const q = searchParams.get("maxEmployees")?.toString();

  const handleSearch = useDebouncedCallback((query: string) => {
    startTransition(async () => {
      const params = new URLSearchParams(searchParams);
      if (query) {
        params.set("maxEmployees", query);
        params.set("page", "1");
      } else {
        params.delete("maxEmployees");
      }
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    // Only allow numbers
    if (!/^\d*$/.test(rawValue)) return;
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
        placeholder="Enter Max Employees"
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
