"use client";

import type { Company } from "@repo/db";
import Pagination from "@/components/pagination";
import { CompaniesDataTable } from "@/app/(protected)/companies/data-table";
import { columns } from "@/app/(protected)/companies/columns";

type CompanyWithTheme = Company & { themeName?: string | null };

interface CompanyContainerProps {
  data: CompanyWithTheme[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function CompanyContainer({
  data,
  totalPages,
}: CompanyContainerProps) {
  return (
    <div>
      <div className="group-has-data-pending:animate-pulse">
        <CompaniesDataTable columns={columns} data={data} />
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
