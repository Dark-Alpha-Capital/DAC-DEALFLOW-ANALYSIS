interface IndustryIntelligenceSummary {
  tam: number | null;
  growthRate: number | null;
  avgEbitdaMargin: number | null;
  avgEntryMultiple: number | null;
  avgExitMultiple: number | null;
  fragmentationScore: number | null;
  sponsorPenetration: number | null;
  cyclicalityScore: number | null;
  disruptionRiskScore: number | null;
}

interface ThemePerformanceSummary {
  dealsSourced: number | null;
  meetingsHeld: number | null;
  loisIssued: number | null;
  dealsClosed: number | null;
  averageEntryMultiple: number | null;
  averageIRR: number | null;
}

interface ThemeAnalyticsProps {
  companyCount: number;
  dealOpportunityCount: number;
  industryIntelligence: IndustryIntelligenceSummary | null;
  performance: ThemePerformanceSummary | null;
}

export default function ThemeAnalytics({
  companyCount,
  dealOpportunityCount,
  industryIntelligence,
  performance,
}: ThemeAnalyticsProps) {
  const hasIntelligence = !!industryIntelligence;
  const hasPerformance = !!performance;

  if (!hasIntelligence && !hasPerformance && !companyCount && !dealOpportunityCount) {
    return null;
  }

  const formatPercent = (value: number | null) =>
    value != null ? `${value.toFixed(1)}%` : "—";

  const formatNumber = (value: number | null) =>
    value != null ? value.toLocaleString() : "—";

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <h2 className="text-muted-foreground text-sm font-medium">
        Theme analytics
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">Active companies</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {companyCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">Deal pipeline</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {dealOpportunityCount.toLocaleString()}
          </p>
        </div>
        {industryIntelligence && (
          <>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">TAM</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatNumber(industryIntelligence.tam)}
              </p>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">Growth rate</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatPercent(industryIntelligence.growthRate)}
              </p>
            </div>
          </>
        )}
      </div>

      {(industryIntelligence || performance) && (
        <div className="grid gap-4 md:grid-cols-2">
          {industryIntelligence && (
            <div className="space-y-2 rounded-md border bg-background p-3 text-xs">
              <p className="text-[11px] font-medium text-muted-foreground">
                Industry structure
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <MetricItem
                  label="Avg EBITDA margin"
                  value={formatPercent(industryIntelligence.avgEbitdaMargin)}
                />
                <MetricItem
                  label="Entry multiple"
                  value={formatNumber(industryIntelligence.avgEntryMultiple)}
                />
                <MetricItem
                  label="Exit multiple"
                  value={formatNumber(industryIntelligence.avgExitMultiple)}
                />
                <MetricItem
                  label="Fragmentation"
                  value={formatNumber(industryIntelligence.fragmentationScore)}
                />
                <MetricItem
                  label="Sponsor penetration"
                  value={formatPercent(industryIntelligence.sponsorPenetration)}
                />
                <MetricItem
                  label="Cyclicality"
                  value={formatNumber(industryIntelligence.cyclicalityScore)}
                />
                <MetricItem
                  label="Disruption risk"
                  value={formatNumber(industryIntelligence.disruptionRiskScore)}
                />
              </dl>
            </div>
          )}

          {performance && (
            <div className="space-y-2 rounded-md border bg-background p-3 text-xs">
              <p className="text-[11px] font-medium text-muted-foreground">
                Performance
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <MetricItem
                  label="Deals sourced"
                  value={formatNumber(performance.dealsSourced)}
                />
                <MetricItem
                  label="Meetings held"
                  value={formatNumber(performance.meetingsHeld)}
                />
                <MetricItem
                  label="LOIs issued"
                  value={formatNumber(performance.loisIssued)}
                />
                <MetricItem
                  label="Deals closed"
                  value={formatNumber(performance.dealsClosed)}
                />
                <MetricItem
                  label="Avg entry multiple"
                  value={formatNumber(performance.averageEntryMultiple)}
                />
                <MetricItem
                  label="Avg IRR"
                  value={formatPercent(performance.averageIRR)}
                />
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[11px] font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

