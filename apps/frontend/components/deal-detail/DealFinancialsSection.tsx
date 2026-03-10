import { formatCurrency, formatPercent } from "@/lib/utils";
import { DollarSign } from "lucide-react";
import type { Deal } from "@repo/db";
import type { DealOpportunity } from "@repo/db/schema";

interface DealFinancialsSectionProps {
  deal: Deal & { id: string };
  currentOpportunity?: DealOpportunity | null;
}

export function DealFinancialsSection({
  deal,
  currentOpportunity,
}: DealFinancialsSectionProps) {
  const revenue = deal.revenue ?? currentOpportunity?.revenue;
  const ebitda = deal.ebitda ?? currentOpportunity?.ebitda;
  const ebitdaMargin = deal.ebitdaMargin ?? currentOpportunity?.ebitdaMargin;
  const askingPrice = deal.askingPrice ?? currentOpportunity?.askingPrice;
  const impliedMultiple = currentOpportunity?.impliedMultiple;

  const items = [
    { label: "Revenue", value: revenue, format: "currency" },
    { label: "EBITDA", value: ebitda, format: "currency" },
    { label: "EBITDA Margin", value: ebitdaMargin, format: "percent" },
    { label: "Asking Price", value: askingPrice, format: "currency" },
    { label: "Implied Multiple", value: impliedMultiple, format: "multiple" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Financial Snapshot
        </h2>
        <p className="text-muted-foreground text-sm">
          Snapshot at listing time
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, value, format }) => (
          <div key={label} className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">
              {label}
            </p>
            <p className="tabular-nums text-sm font-medium text-foreground">
              {value == null
                ? "—"
                : format === "currency"
                  ? formatCurrency(Number(value))
                  : format === "percent"
                    ? formatPercent(Number(value))
                    : format === "multiple"
                      ? `${Number(value).toFixed(1)}x`
                      : String(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
