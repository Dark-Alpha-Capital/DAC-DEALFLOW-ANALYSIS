import { createFileRoute } from "@tanstack/react-router";
function DocsThemesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Themes</h2>
        <p className="max-w-2xl text-muted-foreground">
          Themes represent strategy-level focus areas. They connect thesis quality with
          pipeline execution so teams can allocate time and capital intentionally.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Theme definition by sector, status, and strategic description.</li>
          <li>Priority and conviction scoring.</li>
          <li>Thesis and industry intelligence storage (market size, growth, multiples, risk markers).</li>
          <li>Performance tracking (deals sourced, meetings held, LOIs, closes, and return markers).</li>
          <li>Theme-level view of linked companies and deal opportunities.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Primary decisions supported</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Which strategic themes deserve incremental sourcing effort.</li>
          <li>Whether current pipeline composition aligns with firm conviction.</li>
          <li>Which themes should remain active, pause, or retire.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Recommended workflow</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Define and maintain clear theme description and sector boundaries.</li>
          <li>Refresh conviction and capital priority scores during strategy reviews.</li>
          <li>Map active companies to themes for visibility into execution.</li>
          <li>Use performance metrics to rebalance team attention quarterly.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          A theme is useful only if it influences real pipeline behavior. Keep theme assignment and
          status current so portfolio analytics reflects true strategy execution.
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_documentation/docs/themes")({
  head: () => ({ meta: [{ title: "Themes — Docs" }] }),
  component: DocsThemesPage,
});
