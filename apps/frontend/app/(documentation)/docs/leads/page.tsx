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

      <section id="lead-entity-model" className="space-y-3">
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
        <h3 className="text-xl font-semibold tracking-tight">
          Company leads vs. investor leads
        </h3>
        <p className="text-muted-foreground">
          The same lead discipline applies to both sides of your market. Company leads
          capture potential acquisition targets; investor leads capture potential
          capital partners.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Company leads</span> become
            companies and feed the deals pipeline.
          </li>
          <li>
            <span className="font-medium text-foreground">Investor leads</span> become
            investors and feed your capital relationships.
          </li>
          <li>
            In both cases, conversion creates a canonical record while preserving a
            link back to the original lead.
          </li>
        </ul>
      </section>

      <section id="lead-resolution-actions" className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li id="action-convert-to-company">
            Convert to company: Is this opportunity in-scope enough to become a formal company target?
          </li>
          <li id="action-mark-duplicate">
            Mark duplicate: Does this lead map to an existing company identity in CRM?
          </li>
          <li id="action-reject-lead">
            Reject lead: Is this out-of-scope based on mandate, quality, or relevance?
          </li>
          <li id="action-clear-duplicate">
            Clear duplicate: Was duplicate mapping incorrect and should this return to triage?
          </li>
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
