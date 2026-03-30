
import * as React from "react";
import { useRouter } from "@/lib/navigation-shim";
import { DealsDataTable } from "./data-table";
import { columns } from "./columns";
import { BulkScreenDealsDialog } from "./BulkScreenDealsDialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { RankedDealOpportunityRow } from "@repo/db/queries";
import type { RowSelectionState } from "@tanstack/react-table";

export function DealsWorkspace({
  deals,
}: {
  deals: RankedDealOpportunityRow[];
}) {
  const router = useRouter();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

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
    <div className="w-full space-y-4">
      {deals.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
            <span>Select All</span>
          </label>
          <BulkScreenDealsDialog
            selectedIds={selectedIds}
            onSuccess={() => {
              setRowSelection({});
              router.refresh();
            }}
          />
        </div>
      )}
      <DealsDataTable
        columns={columns}
        data={deals}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
    </div>
  );
}
