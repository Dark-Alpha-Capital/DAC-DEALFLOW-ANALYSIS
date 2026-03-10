"use client";

import { DealsDataTable } from "./data-table";
import { columns } from "./columns";
import type { RankedDealOpportunityRow } from "@repo/db/queries";

export function DealsWorkspace({
  deals,
}: {
  deals: RankedDealOpportunityRow[];
}) {
  return <DealsDataTable columns={columns} data={deals} />;
}
