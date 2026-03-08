export default function DocsCompaniesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Companies</h2>
        <p className="max-w-2xl text-muted-foreground">
          Companies are the canonical record for each target business. This page is where
          your team should preserve institutional knowledge across multiple deal cycles.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Single profile per target company, with dedup-friendly naming and location handling.</li>
          <li>Coverage tracking across statuses: Uncontacted, Contacted, In Discussion, Under LOI, Closed, Passed.</li>
          <li>Company-level financial profile (revenue, EBITDA, margins, concentration, recurring mix).</li>
          <li>Linked deal opportunities, contacts, outreach history, documents, and internal notes.</li>
          <li>Optional linkage to a strategic theme for portfolio-level reporting.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Should we continue engaging this company now, pause, or pass?</li>
          <li>Is this target aligned with our active theme focus and conviction?</li>
          <li>What changed since last review (data, outreach feedback, documents, or AI screening)?</li>
          <li>Do we have enough evidence quality to move to the next interaction or IC discussion?</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Recommended workflow</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Create or convert the company record from a lead when confidence is sufficient.</li>
          <li>Update coverage status and high-level financial markers.</li>
          <li>Attach diligence materials and relevant contacts.</li>
          <li>Log outreach events and outcomes after each touchpoint.</li>
          <li>Use notes to document the latest investment view and open questions.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Keep company records current even when individual deals are inactive. A company can have
          multiple opportunities over time, and clean historical context improves speed and quality
          on future re-engagement.
        </div>
      </section>
    </div>
  );
}
