
import { useState } from "react";
import type { Lead } from "@repo/db";
import Pagination from "@/components/pagination";
import { LeadsDataTable } from "@/components/leads/data-table";
import { columns } from "@/components/leads/columns";
import LeadDetailsDrawer from "@/components/LeadDetailsDrawer";

interface LeadContainerProps {
  data: Lead[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function LeadContainer({
  data,
  totalPages,
}: LeadContainerProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  return (
    <div>
      <div className="group-has-data-pending:animate-pulse">
        <LeadsDataTable
          columns={columns}
          data={data}
          onSelectLead={handleSelectLead}
        />
      </div>
      <div className="mt-8 flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
      <LeadDetailsDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedLead(null);
          }
        }}
      />
    </div>
  );
}
