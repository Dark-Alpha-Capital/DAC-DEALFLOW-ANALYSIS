import type { Company } from "db";
import { formatCurrency } from "@/lib/utils";

interface CompanyFinancialsProps {
  company: Company;
}

export function CompanyFinancials({ company }: CompanyFinancialsProps) {
  const {
    revenueEstimate,
    ebitdaEstimate,
    ebitdaMarginEstimate,
    attractivenessScore,
  } = company;

  if (
    revenueEstimate == null &&
    ebitdaEstimate == null &&
    ebitdaMarginEstimate == null &&
    attractivenessScore == null
  ) {
    return null;
  }

  return (
    <div className="border-border space-y-3 border-b pb-6">
      <h2 className="text-muted-foreground text-sm font-medium">
        Financials &amp; Metrics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {revenueEstimate != null && (
          <div>
            <p className="text-muted-foreground text-xs">Revenue</p>
            <p className="text-foreground font-medium tabular-nums">
              {formatCurrency(revenueEstimate)}
            </p>
          </div>
        )}
        {ebitdaEstimate != null && (
          <div>
            <p className="text-muted-foreground text-xs">EBITDA</p>
            <p className="text-foreground font-medium tabular-nums">
              {formatCurrency(ebitdaEstimate)}
            </p>
          </div>
        )}
        {ebitdaMarginEstimate != null && (
          <div>
            <p className="text-muted-foreground text-xs">EBITDA Margin</p>
            <p className="text-foreground font-medium tabular-nums">
              {(ebitdaMarginEstimate * 100).toFixed(1)}%
            </p>
          </div>
        )}
        {attractivenessScore != null && (
          <div>
            <p className="text-muted-foreground text-xs">Attractiveness Score</p>
            <p className="text-foreground font-medium tabular-nums">
              {attractivenessScore}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

