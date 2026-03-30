
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { ChevronsUpDown, X } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export type SearchableEntityPickerProps = {
  variant: "company" | "investor";
  label: string;
  placeholder?: string;
  emptyHint?: string;
  selectedId: string;
  selectedLabel: string;
  onSelect: (row: { id: string; label: string }) => void;
  onClear: () => void;
  excludeIds: string[];
  id?: string;
};

export function SearchableEntityPicker({
  variant,
  label,
  placeholder = "Search…",
  emptyHint = `Type at least ${MIN_CHARS} characters to search`,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
  excludeIds,
  id,
}: SearchableEntityPickerProps) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [debouncedSearch] = useDebounce(searchValue.trim(), DEBOUNCE_MS);

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const companyQuery = useQuery({
    ...trpc.companies.searchForChat.queryOptions({
      query: debouncedSearch,
      limit: 20,
    }),
    enabled: open && variant === "company" && debouncedSearch.length >= MIN_CHARS,
  });

  const investorQuery = useQuery({
    ...trpc.investors.searchForLink.queryOptions({
      query: debouncedSearch,
      limit: 20,
    }),
    enabled: open && variant === "investor" && debouncedSearch.length >= MIN_CHARS,
  });

  const isFetching =
    variant === "company" ? companyQuery.isFetching : investorQuery.isFetching;

  const rows = useMemo(() => {
    if (variant === "company") {
      const data = companyQuery.data ?? [];
      return data
        .filter((c) => !exclude.has(c.id))
        .map((c) => ({
          id: c.id,
          label: c.name,
          sub:
            [c.industry, c.location].filter(Boolean).join(" · ") || undefined,
        }));
    }
    const data = investorQuery.data ?? [];
    return data
      .filter((i) => !exclude.has(i.id))
      .map((i) => ({
        id: i.id,
        label: i.name,
        sub: i.email ?? undefined,
      }));
  }, [variant, companyQuery.data, investorQuery.data, exclude]);

  useEffect(() => {
    if (open) {
      setSearchValue("");
    }
  }, [open]);

  const showPicker = !selectedId;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {showPicker ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-auto min-h-10 w-full max-w-xl justify-between px-3 py-2 font-normal"
            >
              <span className="text-muted-foreground truncate">
                {placeholder}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(100vw-2rem,28rem)] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={placeholder}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                {debouncedSearch.length < MIN_CHARS ? (
                  <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                    {emptyHint}
                  </div>
                ) : isFetching ? (
                  <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                    Searching…
                  </div>
                ) : rows.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                    No matches. Try a different search.
                  </div>
                ) : (
                  <CommandGroup>
                    {rows.map((row) => (
                      <CommandItem
                        key={row.id}
                        value={row.id}
                        onSelect={() => {
                          onSelect({ id: row.id, label: row.label });
                          setOpen(false);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{row.label}</p>
                          {row.sub ? (
                            <p className="text-muted-foreground truncate text-xs">
                              {row.sub}
                            </p>
                          ) : null}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex max-w-xl items-center gap-2">
          <div
            className={cn(
              "border-input bg-background flex min-h-10 flex-1 items-center rounded-md border px-3 py-2 text-sm",
            )}
          >
            <span className="truncate font-medium">{selectedLabel}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClear}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
