import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

function DocsGettingStartedPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Getting started</h2>
        <p className="max-w-2xl text-muted-foreground">
          This guide is for associates, principals, and partners who are new to the
          platform. The goal is to establish a consistent operating rhythm across
          sourcing, screening, and early diligence.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">First-week workflow</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Review incoming opportunities in Leads and Raw Deals.</li>
          <li>Convert relevant leads into Companies when they represent real targets.</li>
          <li>Track active opportunities in Deals Pipeline by stage and status.</li>
          <li>Use Screenings to compare opportunities with consistent AI-supported criteria.</li>
          <li>Use Analytics for weekly review on volume, conversion, and source quality.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What to do first by role</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold">Associates</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Focus on triage quality: clean lead data, accurate company matching,
              and complete notes/document attachments before handoff.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold">Managing partners / IC leaders</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Focus on decision velocity and consistency: stage movement,
              screening results, and concentration in strategic themes.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Core navigation</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li><span className="font-medium text-foreground">Leads:</span> intake and early triage.</li>
          <li><span className="font-medium text-foreground">Deals:</span> standardized active pipeline.</li>
          <li><span className="font-medium text-foreground">Companies:</span> long-lived target profile.</li>
          <li><span className="font-medium text-foreground">Themes:</span> strategy and thesis alignment.</li>
          <li><span className="font-medium text-foreground">Documents:</span> cross-entity file library.</li>
          <li><span className="font-medium text-foreground">Screenings:</span> AI-based evaluation outputs.</li>
          <li><span className="font-medium text-foreground">Analytics:</span> portfolio-level insight.</li>
          <li><span className="font-medium text-foreground">Jobs:</span> operational status of background tasks.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Suggested reading path</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/docs/leads" className="rounded border px-3 py-1.5 hover:bg-accent">Leads</Link>
          <Link to="/docs/deals" className="rounded border px-3 py-1.5 hover:bg-accent">Deals pipeline</Link>
          <Link to="/docs/companies" className="rounded border px-3 py-1.5 hover:bg-accent">Companies</Link>
          <Link to="/docs/screenings" className="rounded border px-3 py-1.5 hover:bg-accent">Screenings</Link>
          <Link to="/docs/analytics" className="rounded border px-3 py-1.5 hover:bg-accent">Analytics</Link>
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_documentation/docs/getting-started")({
  head: () => ({ meta: [{ title: "Getting started — Docs" }] }),
  component: DocsGettingStartedPage,
});
