import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

const sections = [
  {
    href: "/docs/getting-started",
    title: "Getting started",
    body: "How new team members should begin using the platform in their first week.",
  },
  {
    href: "/docs/leads",
    title: "Leads",
    body: "How incoming opportunities are captured, reviewed, and triaged.",
  },
  {
    href: "/docs/investors",
    title: "Investors",
    body: "How investor leads, investors, and interactions are managed.",
  },
  {
    href: "/docs/deals",
    title: "Deals pipeline",
    body: "How opportunities move from listed to screened, discussed, and closed or declined.",
  },
  {
    href: "/docs/companies",
    title: "Companies",
    body: "The canonical company record and how deal history, contacts, and notes are organized.",
  },
  {
    href: "/docs/themes",
    title: "Themes",
    body: "Investment theses, sector focus, and strategy-level performance tracking.",
  },
  {
    href: "/docs/documents",
    title: "Documents",
    body: "How files are attached to leads, companies, and deals for diligence and collaboration.",
  },
  {
    href: "/docs/screenings",
    title: "Screenings",
    body: "AI-led evaluation outputs, scores, sentiment, and supporting rationale.",
  },
  {
    href: "/docs/analytics",
    title: "Analytics",
    body: "Portfolio-level views across themes, pipeline progression, sources, and screening results.",
  },
  {
    href: "/docs/chat",
    title: "AI assistant",
    body: "Using the chatbot to query your database with natural language.",
  },
  {
    href: "/docs/jobs",
    title: "Jobs",
    body: "Operational tracking for background tasks such as screening and file processing.",
  },
  {
    href: "/docs/admin",
    title: "Admin access",
    body: "Admin-only controls and who should use them.",
  },
  {
    href: "/docs/faq",
    title: "FAQ",
    body: "Common usage questions and operating conventions for the team.",
  },
];

function DocsOverviewPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase text-primary">Dark Alpha Capital</p>
        <h2 className="text-3xl font-semibold tracking-tight">Platform documentation</h2>
        <p className="max-w-2xl text-muted-foreground">
          This platform supports end-to-end deal sourcing and early-stage evaluation.
          It helps teams capture inbound opportunities, normalize them into a clean
          pipeline, evaluate fit against investment themes, and preserve decision context.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this application is built to do</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Create a single source of truth for leads, companies, and deal opportunities.</li>
          <li>Standardize screening and pipeline progression across the investment team.</li>
          <li>Centralize documents, notes, contacts, and outreach history for each target.</li>
          <li>Expose portfolio-level intelligence through analytics and theme performance.</li>
          <li>Reduce manual overhead with AI-assisted screening and background processing.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">How the core objects connect</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Lead</span> is the inbound listing.
            A lead can be converted into a <span className="font-semibold text-foreground">Company</span>.
            A company can have one or more <span className="font-semibold text-foreground">Deal Opportunities</span>
            across time. Documents, contacts, outreach, screenings, and notes attach to these records
            so decisions are transparent and auditable.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Documentation map</h3>
        <p className="text-muted-foreground">
          Use these sections as an operating guide. Each page explains business intent,
          workflow, and practical decision points.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              to={section.href}
              className="rounded-lg border bg-card p-4 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <h4 className="font-semibold">{section.title}</h4>
              <p className="mt-1 text-muted-foreground">{section.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_documentation/docs")({
  head: () => ({ meta: [{ title: "Documentation — Dark Alpha Capital" }] }),
  component: DocsOverviewPage,
});
