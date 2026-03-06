import Link from "next/link";

export default function DocsOverviewPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">
          Dark Alpha Capital
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Product documentation
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          High-level overview of how the Dark Alpha Capital deal sourcing
          platform is structured. These docs will eventually cover concepts,
          workflows, and key screens in detail.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What to expect</h3>
        <p className="text-muted-foreground">
          For now this page contains placeholder content. Over time it will be
          expanded to explain how we:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Organize companies, raw deals, and deals.</li>
          <li>Ingest and manage documents for each company.</li>
          <li>Capture notes, tags, screenings, and analytics.</li>
          <li>Use AI-powered tools to streamline sourcing and review.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Key sections</h3>
        <p className="text-muted-foreground">
          Use the sidebar or the links below to jump into the main sections:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/getting-started"
            className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <h4 className="font-semibold">Getting started</h4>
            <p className="mt-1 text-muted-foreground">
              A future guide to logging in, navigating the app, and the primary
              workflows.
            </p>
          </Link>
          <Link
            href="/docs/companies"
            className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <h4 className="font-semibold">Companies</h4>
            <p className="mt-1 text-muted-foreground">
              Placeholder for a deep dive into company profiles, tabs, and
              related data.
            </p>
          </Link>
          <Link
            href="/docs/documents"
            className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <h4 className="font-semibold">Documents</h4>
            <p className="mt-1 text-muted-foreground">
              Will eventually describe how documents are uploaded, organized,
              and reviewed.
            </p>
          </Link>
          <Link
            href="/docs/faq"
            className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <h4 className="font-semibold">FAQ</h4>
            <p className="mt-1 text-muted-foreground">
              Space for common questions about how the platform behaves.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}

