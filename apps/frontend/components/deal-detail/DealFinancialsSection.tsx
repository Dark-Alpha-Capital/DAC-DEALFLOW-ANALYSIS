import {
  formatCurrency,
  formatDateTimeStable,
  formatPercent,
} from "@/lib/utils";
import { DollarSign } from "lucide-react";
import type { Deal } from "@repo/db";
import type { DealFinancialSnapshot, DealOpportunity } from "@repo/db/schema";

interface DealFinancialsSectionProps {
  deal: Deal & { id: string };
  currentOpportunity?: DealOpportunity | null;
  financialSnapshots?: DealFinancialSnapshot[];
}

export function DealFinancialsSection({
  deal,
  currentOpportunity,
  financialSnapshots = [],
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
          <DollarSign className="text-muted-foreground h-4 w-4" />
          Financial Snapshot
        </h2>
        <p className="text-muted-foreground text-sm">
          Snapshot at listing time
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, value, format }) => (
          <div key={label} className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="text-foreground text-sm font-medium tabular-nums">
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
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Snapshot History</h3>
        {financialSnapshots.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No financial snapshot history available yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Captured At</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Revenue</th>
                  <th className="px-3 py-2 font-medium">EBITDA</th>
                  <th className="px-3 py-2 font-medium">EBITDA Margin</th>
                  <th className="px-3 py-2 font-medium">Asking Price</th>
                  <th className="px-3 py-2 font-medium">Implied Multiple</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {financialSnapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="border-t">
                    <td className="px-3 py-2 tabular-nums">
                      {formatDateTimeStable(snapshot.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {snapshot.source.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.revenue != null
                        ? formatCurrency(snapshot.revenue)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.ebitda != null
                        ? formatCurrency(snapshot.ebitda)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.ebitdaMargin != null
                        ? formatPercent(snapshot.ebitdaMargin)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.askingPrice != null
                        ? formatCurrency(snapshot.askingPrice)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.impliedMultiple != null
                        ? `${snapshot.impliedMultiple.toFixed(2)}x`
                        : "—"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {snapshot.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
