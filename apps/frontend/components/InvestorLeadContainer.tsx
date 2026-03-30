
import type { InvestorLead } from "@repo/db";
import Pagination from "@/components/pagination";
import { InvestorLeadsDataTable } from "@/components/investor-leads/data-table";
import { columns } from "@/components/investor-leads/columns";

interface InvestorLeadContainerProps {
  data: InvestorLead[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function InvestorLeadContainer({
  data,
  totalPages,
}: InvestorLeadContainerProps) {
  return (
    <div>
      <div className="group-has-data-pending:animate-pulse">
        <InvestorLeadsDataTable columns={columns} data={data} />
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
