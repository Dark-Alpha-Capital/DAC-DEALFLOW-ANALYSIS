import { createFileRoute } from "@tanstack/react-router";
function DocsDocumentsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Documents</h2>
        <p className="max-w-2xl text-muted-foreground">
          The Documents module centralizes files across leads, companies, and deal opportunities.
          It reduces version confusion and keeps diligence artifacts tied to the right record.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>File attachment at three levels: Lead, Company, and Deal Opportunity.</li>
          <li>Unified library view for all uploaded documents.</li>
          <li>Categorization for diligence context (financial, legal, tax, technical, commercial, and more).</li>
          <li>Visibility into document metadata such as file name, size, and upload history.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">When to attach at each level</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li><span className="font-medium text-foreground">Lead:</span> broker-provided teaser or initial listing artifacts.</li>
          <li><span className="font-medium text-foreground">Company:</span> reusable materials relevant across multiple opportunities.</li>
          <li><span className="font-medium text-foreground">Deal Opportunity:</span> process-specific documents tied to one transaction cycle.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Practical workflow</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Upload files as early as possible once source quality is trusted.</li>
          <li>Use clear titles and correct categories so downstream users can find material quickly.</li>
          <li>Store persistent reference files at Company level; process files at Deal level.</li>
          <li>Review the global Documents screen weekly to clean duplicates and improve naming consistency.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Operating notes</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Document quality directly impacts screening quality and investment discussions.
          Missing or misattached files are one of the highest-friction issues in pipeline reviews.
        </div>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/_documentation/docs/documents")({
  head: () => ({ meta: [{ title: "Documents — Docs" }] }),
  component: DocsDocumentsPage,
});
