"use client";

import CompanyCard from "@/components/CompanyCard";
import type { Company } from "db";
import Pagination from "@/components/pagination";

type CompanyWithTheme = Company & { themeName?: string | null };

interface CompanyContainerProps {
  data: CompanyWithTheme[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function CompanyContainer({
  data,
  currentPage,
  totalPages,
  totalCount,
}: CompanyContainerProps) {
  return (
    <div>
      <div className="group-has-data-pending:animate-pulse">
        {data.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground text-xl">
              No companies found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {data.map((company) => (
              <CompanyCard key={company.id} company={company} />
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
