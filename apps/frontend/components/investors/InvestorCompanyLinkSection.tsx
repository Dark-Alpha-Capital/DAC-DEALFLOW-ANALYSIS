"use client";

import { FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  InvestorCompanyLinkForm,
  type InvestorCompanyLinkInitial,
} from "@/components/investors/InvestorCompanyLinkForm";

export function InvestorCompanyLinkSection({
  investorId,
  initial,
  className,
}: {
  investorId: string;
  initial: InvestorCompanyLinkInitial;
  /** e.g. mt-0 when embedded in a tab (default keeps spacing for edit page). */
  className?: string;
}) {
  return (
    <FieldSet className={cn("mt-10", className)}>
      <FieldLegend>Linked company</FieldLegend>
      <p className="text-muted-foreground mb-4 text-sm">
        Optional: tie this investor to the company you sourced them from (one
        company per investor).
      </p>
      <InvestorCompanyLinkForm investorId={investorId} initial={initial} />
    </FieldSet>
  );
}
