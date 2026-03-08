export default function DocsDealsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Deals pipeline</h2>
        <p className="max-w-2xl text-muted-foreground">
          Deals is the active pipeline view for decision-making. It organizes opportunities by
          stage and status so the team can prioritize effort and monitor conversion.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Pipeline stages from Listed through Closed or Dead.</li>
          <li>Deal status tracking (Available, Under Contract, Sold, Not Specified).</li>
          <li>Deal-specific records for contacts, outreach, documents, AI screening, and notes.</li>
          <li>Visibility flags such as seen, reviewed, and published.</li>
          <li>Linked company context so decisions are not made in isolation.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Key decisions it supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Which opportunities should move from initial review to deeper work.</li>
          <li>Where bottlenecks are occurring between stages.</li>
          <li>Whether current evidence supports IOI/LOI progression or a pass decision.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Stage progression guidance</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p>
            Typical flow: Listed → Initial Review → Screened → Meeting Held → IOI Submitted
            → LOI Submitted → Diligence → Closed or Dead.
          </p>
          <p className="mt-2">
            Teams should define weekly criteria for stage movement to keep conversion reporting credible.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Use screening outputs to structure debate, not replace judgment.</li>
          <li>Update stage/status immediately after key interactions to avoid stale pipeline views.</li>
          <li>Keep deal-level records complete before partner and IC review.</li>
        </ul>
      </section>
    </div>
  );
}
