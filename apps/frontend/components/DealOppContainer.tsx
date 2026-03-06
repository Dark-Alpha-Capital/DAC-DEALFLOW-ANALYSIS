"use client";

import DealOppCard from "@/components/DealOppCard";
import Pagination from "@/components/pagination";

type DealOppRow = {
  opp: import("@repo/db").DealOpportunity;
  company: { name: string; industry: string | null; location: string | null } | null;
};

interface DealOppContainerProps {
  data: DealOppRow[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function DealOppContainer({
  data,
  currentPage,
  totalPages,
  totalCount,
}: DealOppContainerProps) {
  return (
    <div>
      <div className="group-has-[[data-pending]]:animate-pulse">
        {data.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-xl">No deals found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {data.map((row) => (
              <DealOppCard key={row.opp.id} opp={row.opp} company={row.company} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
