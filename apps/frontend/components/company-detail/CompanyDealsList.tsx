import type { DealOpportunity, Company } from "db";
import DealOppCard from "@/components/DealOppCard";

interface CompanyDealsListProps {
  company: Company;
  dealOpportunities: DealOpportunity[];
}

export function CompanyDealsList({
  company,
  dealOpportunities,
}: CompanyDealsListProps) {
  if (dealOpportunities.length === 0) {
    return (
      <div className="border-border space-y-2 border-b pb-6">
        <h2 className="text-muted-foreground text-sm font-medium">
          Deal opportunities
        </h2>
        <p className="text-muted-foreground text-xs">
          No deal opportunities have been created for this company yet.
        </p>
      </div>
    );
  }

  const companyMeta = {
    name: company.name,
    industry: company.industry ?? null,
    location: company.location ?? null,
  };

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <h2 className="text-muted-foreground text-sm font-medium">
        Deal opportunities
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {dealOpportunities.map((opp) => (
          <DealOppCard key={opp.id} opp={opp} company={companyMeta} />
        ))}
      </div>
    </div>
  );
}

