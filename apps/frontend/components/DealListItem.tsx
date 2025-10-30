import React from "react";
import Link from "next/link";
import type { Deal } from "@prisma/client";
import { ScrollArea } from "./ui/scroll-area";

interface Props {
  deal: Deal;
  selected: boolean;
  onToggle: () => void;
}

export default function DealListItem({ deal, selected, onToggle }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4"
        />
        <div className="space-y-6">
          <div className="space-y-2">
            <ScrollArea className="h-12">
              <span className="font-semibold">{deal.title}</span>
            </ScrollArea>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <p>Brokerage: {deal.brokerage}</p>
            <p>
              Name: {deal.firstName} {deal.lastName}
            </p>
            <p>Email: {deal.email}</p>
            <p>Status: {deal.status}</p>
            <p>Reviewed: {deal.isReviewed ? "Yes" : "No"}</p>
            <p>Published: {deal.isPublished ? "Yes" : "No"}</p>
            <p>LinkedIn: {deal.linkedinUrl}</p>
            <p>Phone: {deal.workPhone}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Revenue:</span>
            <span className="font-medium">${deal.revenue}</span>
            <span>·</span>
            <span>EBITDA:</span>
            <span className="px-2 py-0.5 font-semibold">${deal.ebitda}</span>
            <span>·</span>
            <span>Industry:</span>
            <span className="font-medium">{deal.industry || "—"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0">
        <Link
          href={`/raw-deals/${deal.id}`}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
