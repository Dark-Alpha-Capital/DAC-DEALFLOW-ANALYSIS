import { createFileRoute } from "@tanstack/react-router";
function DocsJobsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Jobs</h2>
        <p className="max-w-2xl text-muted-foreground">
          Jobs tracks asynchronous background work such as deal screening and file-related processing.
          It provides operational transparency and helps teams quickly resolve bottlenecks.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Job visibility by state (waiting, active, completed, failed).</li>
          <li>Filtering by job type and status.</li>
          <li>Progress monitoring and refresh for near-real-time tracking.</li>
          <li>Single and bulk job cleanup for operational hygiene.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">When to use this page</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>When screening output has not appeared and you need to confirm processing status.</li>
          <li>When file ingestion appears delayed.</li>
          <li>When failed jobs need cleanup and rerun planning.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operational recommendations</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Review active and failed jobs daily during heavy sourcing periods.</li>
          <li>Investigate repeated failures by job type to identify systemic issues.</li>
          <li>Keep the queue clean by deleting obsolete failed/completed jobs after review.</li>
        </ol>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_documentation/docs/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Docs" }] }),
  component: DocsJobsPage,
});
