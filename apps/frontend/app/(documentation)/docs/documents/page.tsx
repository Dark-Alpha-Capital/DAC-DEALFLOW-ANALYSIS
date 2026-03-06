export default function DocsDocumentsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Documents</h2>
        <p className="max-w-2xl text-muted-foreground">
          This section will describe how documents are uploaded, processed, and
          attached to companies and deals. It currently contains placeholder
          copy only.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">
          Topics to be documented
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Supported file types and size limits.</li>
          <li>How document uploads integrate with the Documents screen.</li>
          <li>Where documents appear inside a company&apos;s detail view.</li>
          <li>Any AI-based analysis or extraction that runs on documents.</li>
        </ul>
      </section>
    </div>
  );
}

