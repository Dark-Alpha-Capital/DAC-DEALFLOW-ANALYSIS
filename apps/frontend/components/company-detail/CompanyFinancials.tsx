import type { Company } from "@repo/db";
import { formatCurrency } from "@/lib/utils";

interface CompanyFinancialsProps {
  company: Company;
}

export function CompanyFinancials({ company }: CompanyFinancialsProps) {
  const {
    revenueEstimate,
    ebitdaEstimate,
    ebitdaMarginEstimate,
    recurringRevenuePct,
    customerConcentrationPct,
    founderAgeEstimate,
    attractivenessScore,
  } = company;

  if (
    revenueEstimate == null &&
    ebitdaEstimate == null &&
    ebitdaMarginEstimate == null &&
    recurringRevenuePct == null &&
    customerConcentrationPct == null &&
    founderAgeEstimate == null &&
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
        {recurringRevenuePct != null && (
          <div>
            <p className="text-muted-foreground text-xs">Recurring Revenue %</p>
            <p className="text-foreground font-medium tabular-nums">
              {(recurringRevenuePct * 100).toFixed(1)}%
            </p>
          </div>
        )}
        {customerConcentrationPct != null && (
          <div>
            <p className="text-muted-foreground text-xs">Customer Concentration %</p>
            <p className="text-foreground font-medium tabular-nums">
              {(customerConcentrationPct * 100).toFixed(1)}%
            </p>
          </div>
        )}
        {founderAgeEstimate != null && (
          <div>
            <p className="text-muted-foreground text-xs">Founder Age</p>
            <p className="text-foreground font-medium tabular-nums">
              {founderAgeEstimate}
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

