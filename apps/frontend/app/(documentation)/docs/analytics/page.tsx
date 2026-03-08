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
          <li>Deals by Stage: opportunity distribution across the pipeline.</li>
          <li>Lead Flow: NEW, PROCESSED, DUPLICATE, and REJECTED status funnel.</li>
          <li>New Leads, Processed Leads, Duplicates: headline KPI counters.</li>
          <li>Active Themes: count of currently active strategic themes.</li>
          <li>Companies per Theme and Deals per Theme: concentration across themes.</li>
          <li>Top Deals: ranked by each deal&apos;s latest AI screening score.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Where pipeline progression is slowing and requires intervention.</li>
          <li>How lead intake quality is trending through processing and duplicate control.</li>
          <li>Whether current company and deal mix aligns with active themes.</li>
          <li>Which high-scoring deals deserve immediate partner attention.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Recommended review cadence</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Weekly: deals by stage, lead flow, and top deals ranking.</li>
          <li>Bi-weekly: theme concentration and active-theme coverage balance.</li>
          <li>Monthly or quarterly: score thresholds and stage velocity operating rules.</li>
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
