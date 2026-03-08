export default function DocsAnalyticsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Analytics</h2>
        <p className="max-w-2xl text-muted-foreground">
          Analytics gives leadership-level visibility into pipeline health, sourcing efficiency,
          theme concentration, and AI screening distribution.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Current dashboard coverage</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Deals by Theme: opportunity concentration across strategic focus areas.</li>
          <li>Pipeline Conversion: opportunity counts by stage.</li>
          <li>Source Performance: combined lead and deal volume by source website.</li>
          <li>Screening Scores: distribution of AI scores by scoring bands.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Which sourcing channels should be scaled, adjusted, or deprioritized.</li>
          <li>Where pipeline progression is slowing and requires intervention.</li>
          <li>Whether current deal mix aligns with strategic themes.</li>
          <li>How strict or flexible screening thresholds should be by strategy segment.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Recommended review cadence</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Weekly: pipeline conversion and source performance.</li>
          <li>Bi-weekly: screening score distribution and deal triage behavior.</li>
          <li>Monthly or quarterly: theme concentration against strategy priorities.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Analytics is strongest when front-line updates are timely. Ensure stage, status,
          and conversion actions are updated immediately after material events.
        </div>
      </section>
    </div>
  );
}
