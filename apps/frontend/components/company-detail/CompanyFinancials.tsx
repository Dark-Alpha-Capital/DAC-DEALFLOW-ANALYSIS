
import type { Company } from "@repo/db";
import type { CompanyFinancialSnapshot } from "@repo/db/schema";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import { DollarSign } from "lucide-react";
import { AddCompanyFinancialSnapshotDialog } from "./AddCompanyFinancialSnapshotDialog";

const SNAPSHOT_PERIOD_LOCALE = "en-US";
const SNAPSHOT_PERIOD_TZ = "UTC";

/** Period end is stored as a timestamp; show calendar date + time on each snapshot row. */
function formatSnapshotPeriodEnd(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { dateLine: "—", timeLine: null as string | null };
  const dateLine = new Intl.DateTimeFormat(SNAPSHOT_PERIOD_LOCALE, {
    timeZone: SNAPSHOT_PERIOD_TZ,
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  const timeLine = new Intl.DateTimeFormat(SNAPSHOT_PERIOD_LOCALE, {
    timeZone: SNAPSHOT_PERIOD_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  return { dateLine, timeLine: `${timeLine} ${SNAPSHOT_PERIOD_TZ}` };
}

interface CompanyFinancialsProps {
  company: Company;
  financialSnapshots: CompanyFinancialSnapshot[];
}

export function CompanyFinancials({
  company,
  financialSnapshots = [],
}: CompanyFinancialsProps) {
  const {
    revenueEstimate,
    ebitdaEstimate,
    ebitdaMarginEstimate,
    recurringRevenuePct,
    customerConcentrationPct,
    founderAgeEstimate,
    attractivenessScore,
    revenueTtm,
    ebitdaTtm,
    grossMargin,
    revenueCagr,
    employees,
    totalClients,
    top10Concentration,
  } = company;

  const currentItems = [
    { label: "Revenue (TTM)", value: revenueTtm ?? revenueEstimate },
    { label: "EBITDA (TTM)", value: ebitdaTtm ?? ebitdaEstimate },
    { label: "EBITDA Margin", value: ebitdaMarginEstimate },
    { label: "Gross Margin", value: grossMargin },
    { label: "Revenue CAGR", value: revenueCagr },
    { label: "Recurring Revenue %", value: recurringRevenuePct },
    { label: "Employees", value: employees },
    { label: "Total Clients", value: totalClients },
    { label: "Top 10 Concentration", value: top10Concentration },
    { label: "Customer Concentration %", value: customerConcentrationPct },
    { label: "Founder Age", value: founderAgeEstimate },
    { label: "Attractiveness Score", value: attractivenessScore },
  ].filter((i) => i.value != null);

  const hasAny =
    currentItems.length > 0 || financialSnapshots.length > 0;

  if (!hasAny) {
    return (
      <div className="border-border space-y-3 border-b pb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-medium">
            Financials &amp; Metrics
          </h2>
          <AddCompanyFinancialSnapshotDialog companyId={company.id} />
        </div>
        <p className="text-muted-foreground text-sm">
          No financial data yet. Add a snapshot to track financials over time.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border space-y-6 border-b pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4" />
          Financials &amp; Metrics
        </h2>
        <AddCompanyFinancialSnapshotDialog companyId={company.id} />
      </div>

      {currentItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {currentItems.map(({ label, value }) => {
            const isPercent =
              label.includes("Margin") ||
              label.includes("Concentration") ||
              label.includes("CAGR") ||
              label.includes("Recurring");
            const display =
              typeof value === "number"
                ? isPercent
                  ? formatPercent(value)
                  : formatCurrency(value)
                : String(value);
            return (
              <div key={label}>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="text-foreground font-medium tabular-nums">
                  {display}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Financial History</h3>
        {financialSnapshots.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No financial snapshot history yet. Add one to track changes over
            time.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Reporting period</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Revenue</th>
                  <th className="px-3 py-2 font-medium">EBITDA</th>
                  <th className="px-3 py-2 font-medium">Gross Margin</th>
                  <th className="px-3 py-2 font-medium">Revenue CAGR</th>
                  <th className="px-3 py-2 font-medium">Employees</th>
                  <th className="px-3 py-2 font-medium">Clients</th>
                  <th className="px-3 py-2 font-medium">Recurring %</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {financialSnapshots.map((snapshot) => {
                  const { dateLine, timeLine } = formatSnapshotPeriodEnd(
                    snapshot.periodEnd,
                  );
                  return (
                  <tr key={snapshot.id} className="border-t">
                    <td className="px-3 py-2 align-top">
                      <p className="text-foreground font-medium leading-snug">
                        {dateLine}
                      </p>
                      {timeLine ? (
                        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                          {timeLine}
                        </p>
                      ) : null}
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
                      {snapshot.grossMargin != null
                        ? formatPercent(snapshot.grossMargin)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.revenueCagr != null
                        ? formatPercent(snapshot.revenueCagr)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.employees ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.totalClients ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {snapshot.recurringRevenuePct != null
                        ? formatPercent(snapshot.recurringRevenuePct)
                        : "—"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {snapshot.notes ?? "—"}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
