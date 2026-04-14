import * as React from "react";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Table2 } from "lucide-react";
import { useRouter } from "@/lib/navigation-shim";
import { DealsDataTable } from "./data-table";
import { DealsKanbanBoard } from "./deals-kanban-board";
import { columns } from "./columns";
import { BulkScreenDealsDialog } from "./BulkScreenDealsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Pagination from "@/components/pagination";
import type { RankedDealOpportunityRow } from "@repo/db/queries";
import type { BitrixDealStageRow } from "@repo/bitrix-sync";
import type { RowSelectionState } from "@tanstack/react-table";

const dealOpportunitiesRouteApi = getRouteApi(
  "/_protected/deal-opportunities/",
);

type DealsViewMode = "table" | "kanban";

/** Kanban is implemented but not offered in the UI; flip to `true` to restore the layout toggle. */
const SHOW_KANBAN_IN_UI = false;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function DealsWorkspace({
  deals,
  pipelineStages,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
}: {
  deals: RankedDealOpportunityRow[];
  pipelineStages: BitrixDealStageRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}) {
  const router = useRouter();
  const navigate = dealOpportunitiesRouteApi.useNavigate();
  const { q } = dealOpportunitiesRouteApi.useSearch();
  const isRouteLoading = useRouterState({
    select: (s) => s.isLoading,
  });

  const [view, setView] = React.useState<DealsViewMode>("table");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [draftQ, setDraftQ] = React.useState(q);

  React.useEffect(() => {
    setDraftQ(q);
  }, [q]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      if (draftQ === q) return;
      navigate({
        search: (prev) => ({ ...prev, q: draftQ, page: 1 }),
        replace: true,
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [draftQ, q, navigate]);

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  const statusMessage =
    totalCount === 0
      ? "No deal opportunities match the current search or filters."
      : `Showing ${rangeStart} to ${rangeEnd} of ${totalCount} deals. Page ${currentPage} of ${totalPages}.`;

  const selectedIds = React.useMemo(() => {
    return Object.keys(rowSelection).filter((id) => rowSelection[id]);
  }, [rowSelection]);

  const allSelected = deals.length > 0 && selectedIds.length === deals.length;

  function toggleAll() {
    setRowSelection(
      allSelected ? {} : Object.fromEntries(deals.map((d) => [d.opp.id, true])),
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Label
            htmlFor="deal-opportunities-search"
            className="text-sm font-medium"
          >
            Search deals
          </Label>
          <Input
            id="deal-opportunities-search"
            type="search"
            name="q"
            role="searchbox"
            autoComplete="off"
            enterKeyHint="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigate({
                  search: (prev) => ({ ...prev, q: draftQ, page: 1 }),
                  replace: true,
                });
              }
              if (e.key === "Escape") {
                setDraftQ("");
                navigate({
                  search: (prev) => ({ ...prev, q: "", page: 1 }),
                  replace: true,
                });
              }
            }}
            placeholder="Title, teaser, location, brokerage…"
            className="h-11 w-full max-w-xl text-base sm:text-sm"
            aria-describedby="deal-opportunities-search-hint"
            aria-controls="deal-opportunities-results"
          />
          <p
            id="deal-opportunities-search-hint"
            className="text-muted-foreground text-xs leading-snug"
          >
            Matches listing title, teaser, description, location, and brokerage.
            Updates shortly after you stop typing. Press Enter to search
            immediately, Escape to clear.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deal-opportunities-page-size" className="sr-only">
              Rows per page
            </Label>
            <select
              id="deal-opportunities-page-size"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-11 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={pageSize}
              aria-label="Rows per page"
              onChange={(e) => {
                const next = Number(e.target.value);
                if (
                  !PAGE_SIZE_OPTIONS.includes(
                    next as (typeof PAGE_SIZE_OPTIONS)[number],
                  )
                )
                  return;
                navigate({
                  search: (prev) => ({ ...prev, limit: next, page: 1 }),
                });
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        id="deal-opportunities-results-announcement"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {SHOW_KANBAN_IN_UI ? (
          deals.length > 0 && view === "table" ? (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all deals on this page"
                />
                <span>Select all on page</span>
              </label>
              <BulkScreenDealsDialog
                selectedIds={selectedIds}
                onSuccess={() => {
                  setRowSelection({});
                  void router.invalidate();
                }}
              />
            </div>
          ) : deals.length > 0 && view === "kanban" ? (
            <span className="text-muted-foreground text-sm">
              Switch to table to select deals and bulk screen.
            </span>
          ) : (
            <span className="text-muted-foreground text-sm" />
          )
        ) : deals.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all deals on this page"
              />
              <span>Select all on page</span>
            </label>
            <BulkScreenDealsDialog
              selectedIds={selectedIds}
              onSuccess={() => {
                setRowSelection({});
                void router.invalidate();
              }}
            />
          </div>
        ) : (
          <span className="text-muted-foreground text-sm" />
        )}
        {SHOW_KANBAN_IN_UI ? (
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v === "table" || v === "kanban") setView(v);
            }}
            variant="outline"
            size="sm"
            aria-label="Deal list layout"
          >
            <ToggleGroupItem
              value="table"
              aria-label="Table view"
              className="px-0"
            >
              <Table2 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="kanban"
              aria-label="Kanban view"
              className="px-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
      </div>

      <div
        id="deal-opportunities-results"
        aria-busy={isRouteLoading}
        className="min-w-0"
      >
        {SHOW_KANBAN_IN_UI && view === "kanban" ? (
          <div className="min-w-0 pt-1 pb-6 sm:px-1 sm:pb-8">
            <DealsKanbanBoard
              pipelineStages={pipelineStages}
              countsByStage={{}}
              initialRowsByStage={{}}
              limitPerStage={40}
              pipelineCategoryId="0"
              fallbackStageId="NEW"
              allPipelineStageIds={pipelineStages.map((s) => s.statusId)}
              query={q}
            />
          </div>
        ) : (
          <DealsDataTable
            columns={columns}
            data={deals}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        )}
      </div>

      <div className="flex justify-center pt-2">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
