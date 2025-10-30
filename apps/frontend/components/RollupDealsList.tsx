"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import RemoveDealFromRollupButton from "@/components/Buttons/remove-deal-from-rollup-button";
import { Deal } from "@prisma/client";

interface RollupDealsListProps {
  deals: Deal[];
  rollupId: string;
  currentUserRole?: string;
}

export default function RollupDealsList({
  deals,
  rollupId,
  currentUserRole,
}: RollupDealsListProps) {
  const [expandedDeals, setExpandedDeals] = useState<Record<string, boolean>>(
    {},
  );

  const toggleDeal = (dealId: string) => {
    setExpandedDeals((prev) => ({ ...prev, [dealId]: !prev[dealId] }));
  };

  if (deals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No deals in this rollup.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {deals.map((deal) => {
        const expanded = expandedDeals[deal.id];
        return (
          <li
            key={deal.id}
            className="rounded-md border bg-background p-3 shadow-sm"
          >
            <div
              className="flex cursor-pointer items-center justify-between"
              onClick={() => toggleDeal(deal.id)}
            >
              <span className="font-semibold">
                {deal.title || deal.dealCaption}
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>

            {expanded && (
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div>
                  Brokerage: {deal.brokerage} | Revenue: $
                  {deal.revenue.toLocaleString()} | EBITDA: $
                  {deal.ebitda.toLocaleString()} | EBITDA Margin:{" "}
                  {deal.ebitdaMargin ?? "—"}% | Industry: {deal.industry}
                </div>
                {deal.grossRevenue && (
                  <div>
                    Gross Revenue: ${deal.grossRevenue.toLocaleString()}
                  </div>
                )}
                {deal.askingPrice && (
                  <div>Asking Price: ${deal.askingPrice.toLocaleString()}</div>
                )}
                {deal.companyLocation && (
                  <div>Location: {deal.companyLocation}</div>
                )}
                {deal.dealTeaser && (
                  <div className="mt-2">
                    <strong>Deal Teaser:</strong> {deal.dealTeaser}
                  </div>
                )}
                {deal.chunk_text && (
                  <div className="mt-2">
                    <strong>Chunk Text:</strong> {deal.chunk_text}
                  </div>
                )}
                {deal.description && (
                  <div className="mt-2">
                    <strong>Description:</strong> {deal.description}
                  </div>
                )}

                <RemoveDealFromRollupButton
                  dealId={deal.id}
                  rollupId={rollupId}
                  userRole={currentUserRole}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
