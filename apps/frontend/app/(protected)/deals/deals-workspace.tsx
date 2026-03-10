"use client";

import Link from "next/link";
import { DealsDataTable } from "./data-table";
import { columns } from "./columns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { RankedDealOpportunityRow } from "@repo/db/queries";
import { formatCurrency } from "@/lib/utils";

type AIDealRow = Awaited<
  ReturnType<
    typeof import("@repo/db/queries").GetDealOpportunitiesWithScreenings
  >
>[number];

export function DealsWorkspace({
  screeningDeals,
  aiDeals,
}: {
  screeningDeals: RankedDealOpportunityRow[];
  aiDeals: AIDealRow[];
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Deterministic Screening</h2>
        <DealsDataTable columns={columns} data={screeningDeals} />
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold">AI Screenings</h2>
        <AiScreeningsTable data={aiDeals} />
      </section>
    </div>
  );
}

function AiScreeningsTable({ data }: { data: AIDealRow[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border p-8 text-sm">
        No AI screenings have been saved yet.
      </div>
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-lg border">
      <Table className="min-w-120">
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">EBITDA</TableHead>
            <TableHead className="text-center">AI Runs</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const latest = row.screenings[0];
            return (
              <TableRow key={row.opportunity.id}>
                <TableCell className="font-medium">
                  {row.company?.name ?? row.opportunity.dealTeaser ?? "Deal"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.opportunity.revenue != null
                    ? formatCurrency(row.opportunity.revenue)
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.opportunity.ebitda != null
                    ? formatCurrency(row.opportunity.ebitda)
                    : "—"}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {row.screenings.length}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {latest?.title ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/deals/${row.opportunity.id}?tab=screenings`}
                    >
                      Open AI Screening
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
