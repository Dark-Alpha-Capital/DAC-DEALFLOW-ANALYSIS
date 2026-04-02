
import type { Investor } from "@repo/db";
import Pagination from "@/components/pagination";
import { InvestorsDataTable } from "@/components/investors/data-table";
import { columns } from "@/components/investors/columns";

interface InvestorContainerProps {
  data: Investor[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function InvestorContainer({
  data,
  totalPages,
}: InvestorContainerProps) {
  return (
    <div>
      <div className="group-has-data-pending:animate-pulse">
        <InvestorsDataTable columns={columns} data={data} />
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
