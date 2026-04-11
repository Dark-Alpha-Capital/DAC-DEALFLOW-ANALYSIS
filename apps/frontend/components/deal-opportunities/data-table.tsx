import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { DealOppRow } from "./columns";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/lib/navigation-shim";
import { formatNumberWithCommas } from "@/lib/utils";

function isInteractiveRowClickTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button, a, input, select, textarea, label, [role='checkbox'], [role='menuitem']",
      ),
    )
  );
}

interface DealsDataTableProps {
  columns: ColumnDef<DealOppRow>[];
  data: DealOppRow[];
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}

export function DealsDataTable({
  columns,
  data,
  rowSelection = {},
  onRowSelectionChange,
}: DealsDataTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "screeningStatus", desc: false },
    { id: "title", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.opp.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div
        role="search"
        aria-label="Refine deals on this page"
        className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4"
      >
        <p className="text-muted-foreground w-full text-xs sm:order-last sm:basis-full">
          Column filters apply only to deals on the current page. Use the main
          search above to search across all deals.
        </p>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[11rem] sm:grow sm:basis-[10rem]">
          <Label htmlFor="deals-table-filter-revenue" className="text-xs">
            Revenue contains
          </Label>
          <Input
            id="deals-table-filter-revenue"
            placeholder="e.g. 1,000,000"
            inputMode="decimal"
            value={
              (table.getColumn("revenue")?.getFilterValue() as string) ?? ""
            }
            onChange={(e) => {
              const formatted = formatNumberWithCommas(e.target.value);
              table.getColumn("revenue")?.setFilterValue(formatted);
            }}
            className="w-full tabular-nums"
            aria-label="Filter table rows by revenue text"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[11rem] sm:grow sm:basis-[10rem]">
          <Label htmlFor="deals-table-filter-ebitda" className="text-xs">
            EBITDA contains
          </Label>
          <Input
            id="deals-table-filter-ebitda"
            placeholder="e.g. 500,000"
            inputMode="decimal"
            value={
              (table.getColumn("ebitda")?.getFilterValue() as string) ?? ""
            }
            onChange={(e) => {
              const formatted = formatNumberWithCommas(e.target.value);
              table.getColumn("ebitda")?.setFilterValue(formatted);
            }}
            className="w-full tabular-nums"
            aria-label="Filter table rows by EBITDA text"
          />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-44 sm:shrink-0">
          <Label htmlFor="deals-table-filter-screening" className="text-xs">
            Screening status
          </Label>
          <Select
            value={
              (table.getColumn("screeningStatus")?.getFilterValue() as string) ??
              "all"
            }
            onValueChange={(v) =>
              table
                .getColumn("screeningStatus")
                ?.setFilterValue(v === "all" ? "" : v)
            }
          >
            <SelectTrigger
              id="deals-table-filter-screening"
              className="w-full"
              aria-label="Filter table rows by screening status"
            >
              <SelectValue placeholder="Screening" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All screens</SelectItem>
              <SelectItem value="PASS">Pass</SelectItem>
              <SelectItem value="FAIL">Fail</SelectItem>
              <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
              <SelectItem value="UNSCREENED">Unscreened</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="bg-card overflow-x-auto rounded-lg border">
        <Table className="min-w-120">
          <TableCaption className="sr-only">
            Deal opportunities on this page. Use column headers to sort.
          </TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      (header.column.columnDef.meta as { className?: string })
                        ?.className
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-muted/60 cursor-pointer"
                  onClick={(e) => {
                    if (isInteractiveRowClickTarget(e.target)) return;
                    router.push(`/deal-opportunities/${row.original.opp.id}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as { className?: string })
                          ?.className
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No deal opportunities found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
