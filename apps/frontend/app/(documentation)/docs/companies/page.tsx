export default function DocsCompaniesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Companies</h2>
        <p className="max-w-2xl text-muted-foreground">
          This page will document how company records are modeled and managed in
          the app. For now it serves as a placeholder for more detailed
          explanations.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">
          Future content ideas
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Structure of the company detail view and its tabs.</li>
          <li>
            Relationship between companies, raw deals, deals, documents, and
            notes.
          </li>
          <li>How tags, themes, and screenings interact with companies.</li>
          <li>Common workflows for updating and reviewing companies.</li>
        </ul>
      </section>
    </div>
  );
}

