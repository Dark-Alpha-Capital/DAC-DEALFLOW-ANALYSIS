"use client";

import { useState } from "react";
import type { Lead } from "db";
import Pagination from "@/components/pagination";
import LeadTable from "@/components/LeadTable";
import LeadDetailsDrawer from "@/components/LeadDetailsDrawer";

interface LeadContainerProps {
  data: Lead[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function LeadContainer({
  data,
  currentPage,
  totalPages,
  totalCount,
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
        <LeadTable data={data} onSelectLead={handleSelectLead} />
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
