import { createFileRoute } from "@tanstack/react-router";
function DocsCompaniesPage() {
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

      <section id="company-coverage" className="space-y-3 scroll-mt-24">
        <h3 className="text-xl font-semibold tracking-tight">Company coverage</h3>
        <p className="text-muted-foreground">
          Company coverage is the operating layer for all relationship intelligence on a target.
          Coverage quality depends on keeping status, relationships, and historical context current
          after every interaction.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Use <span className="font-medium text-foreground">coverage status</span> to reflect
            current engagement state: Uncontacted, Contacted, In Discussion, Under LOI, Closed, Passed.
          </li>
          <li>
            Keep company profile data accurate (industry, location, financial markers) so downstream
            analytics and prioritization stay reliable.
          </li>
          <li>
            Track all interactions through contacts, outreach, documents, and notes so context is not
            lost across team members or deal cycles.
          </li>
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
          <li>Assign or update the strategic theme for portfolio alignment.</li>
          <li>Add key contacts for the relationship map.</li>
          <li>Log outreach events and outcomes after each touchpoint.</li>
          <li>Use notes to document the latest investment view and open questions.</li>
        </ol>
      </section>

      <section id="workflow-add-contact" className="space-y-3 scroll-mt-24">
        <h3 className="text-xl font-semibold tracking-tight">Workflow: Add contact</h3>
        <p className="text-muted-foreground">
          Contacts represent the people graph around a company. Add contacts as soon as they become
          relevant to sourcing, qualification, or diligence.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open company detail and switch to the Contacts tab.</li>
          <li>Use <span className="font-medium text-foreground">Add contact</span>.</li>
          <li>Capture required and high-value optional fields: name, title, email, phone, LinkedIn, role.</li>
          <li>Save and verify the contact appears in the list for immediate reuse in outreach and review.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Best practice: maintain role clarity (owner, broker, founder, operator, advisor) to improve
          communication planning and handoff quality.
        </p>
      </section>

      <section id="workflow-add-outreach" className="space-y-3 scroll-mt-24">
        <h3 className="text-xl font-semibold tracking-tight">Workflow: Add outreach</h3>
        <p className="text-muted-foreground">
          Outreach records are the interaction timeline for company engagement. Each record should
          represent one distinct touchpoint.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open company detail and switch to the Outreach tab.</li>
          <li>Click <span className="font-medium text-foreground">Add outreach</span>.</li>
          <li>Select outreach type (Email, Call, LinkedIn, Meeting).</li>
          <li>Optionally link to a specific deal opportunity for attribution when relevant.</li>
          <li>Optionally capture outcome and notes, then save.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Outcome and notes are optional in-product to keep logging fast, but teams should treat
          outcome as strongly recommended for auditability and next-step clarity.
        </p>
      </section>

      <section id="workflow-add-notes" className="space-y-3 scroll-mt-24">
        <h3 className="text-xl font-semibold tracking-tight">Workflow: Add notes</h3>
        <p className="text-muted-foreground">
          Notes capture qualitative reasoning, investment perspective changes, and open questions
          that are not represented in structured fields.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open company detail and switch to the Notes tab.</li>
          <li>Use <span className="font-medium text-foreground">Add note</span>.</li>
          <li>Provide a concise title when useful and write the body in Markdown.</li>
          <li>Save, then edit/delete as understanding evolves.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Best practice: write notes as decision-ready updates with context, evidence, and explicit
          implications for next actions.
        </p>
      </section>

      <section id="workflow-assign-theme" className="space-y-3 scroll-mt-24">
        <h3 className="text-xl font-semibold tracking-tight">Workflow: Assign theme</h3>
        <p className="text-muted-foreground">
          Theme assignment links company activity to strategy-level focus areas and powers theme
          concentration and performance analysis.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Open company detail and go to the Overview tab.</li>
          <li>Use the inline <span className="font-medium text-foreground">Assign theme</span> control.</li>
          <li>Select a theme or choose Unassigned.</li>
          <li>Save and verify the updated theme appears in company context and reporting views.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Revisit theme assignment whenever investment thesis or company trajectory changes to avoid
          stale portfolio analytics.
        </p>
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

export const Route = createFileRoute("/_documentation/docs/companies")({
  head: () => ({ meta: [{ title: "Companies — Docs" }] }),
  component: DocsCompaniesPage,
});
