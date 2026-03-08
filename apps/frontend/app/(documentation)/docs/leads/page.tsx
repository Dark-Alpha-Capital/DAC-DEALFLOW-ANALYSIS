export default function DocsLeadsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Leads</h2>
        <p className="max-w-2xl text-muted-foreground">
          Leads represent inbound opportunities before they are fully normalized.
          This is your intake layer for triage, quality control, and conversion readiness.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Capture source listing data and broker details.</li>
          <li>Store initial financial markers (revenue, EBITDA, asking price).</li>
          <li>Track lead status: New, Processed, Duplicate, Rejected.</li>
          <li>Convert qualified leads into company records for structured pipeline work.</li>
          <li>Retain traceability from company record back to first-seen lead.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Is this opportunity in-scope enough to convert into a formal company target?</li>
          <li>Is this a duplicate of an existing target or an independent opportunity?</li>
          <li>Do we have enough information to begin outreach or screening?</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Recommended workflow</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Review listing title, source, and broker metadata for validity.</li>
          <li>Complete missing high-impact fields (industry, location, basic financials).</li>
          <li>Check whether a related company already exists.</li>
          <li>Set lead status and convert to company when appropriate.</li>
          <li>Link downstream deal opportunities as they emerge.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Intake discipline drives pipeline quality. Inconsistent lead triage creates noise,
          duplicate work, and lower confidence in stage conversion metrics.
        </div>
      </section>
    </div>
  );
}
