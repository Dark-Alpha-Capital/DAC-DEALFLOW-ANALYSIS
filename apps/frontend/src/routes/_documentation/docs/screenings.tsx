import { createFileRoute } from "@tanstack/react-router";
function DocsScreeningsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Screenings</h2>
        <p className="max-w-2xl text-muted-foreground">
          Screenings provide AI-assisted evaluation for deal opportunities. They improve consistency
          in early analysis by storing score, sentiment, and rationale in one place.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Reusable screener definitions.</li>
          <li>Per-deal AI screening outputs with score and sentiment.</li>
          <li>Detailed written reasoning for transparency and auditability.</li>
          <li>Portfolio view of screening outcomes across the active pipeline.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">How to use screening output</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Use score as a prioritization signal, not as a standalone investment decision.</li>
          <li>Review explanation text before advancing or rejecting opportunities.</li>
          <li>Compare outcomes across similar deals to improve consistency in analyst judgment.</li>
          <li>Capture disagreement explicitly in notes when human judgment differs from AI output.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Where to allocate immediate analyst bandwidth.</li>
          <li>Which deals deserve partner-level review next.</li>
          <li>Whether negative screening should trigger pause, additional diligence, or pass.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Screening quality depends on data quality. Missing or weak inputs (financials, documents,
          context notes) can produce low-confidence output.
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_documentation/docs/screenings")({
  head: () => ({ meta: [{ title: "Screenings — Docs" }] }),
  component: DocsScreeningsPage,
});
