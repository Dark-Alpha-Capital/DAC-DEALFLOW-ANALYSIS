export default function DocsFaqPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          A future home for common questions about how the Dark Alpha Capital
          platform behaves. For now, this page only contains placeholder
          entries.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">
            How does this documentation relate to the UI?
          </h3>
          <p className="text-muted-foreground">
            Eventually, each section here will mirror key screens and flows in
            the product (dashboard, companies, documents, raw deals, etc.) so
            that new team members can understand what they are seeing.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold">
            Who is the intended audience?
          </h3>
          <p className="text-muted-foreground">
            These docs are primarily for internal users and collaborators who
            need a deeper explanation of how the sourcing and review process
            works in this app.
          </p>
        </div>
        <div>
          <h3 className="text-base font-semibold">
            What level of detail will be covered?
          </h3>
          <p className="text-muted-foreground">
            Over time this space will capture both high-level concepts and
            concrete, step-by-step instructions, including edge cases and
            operational guidelines.
          </p>
        </div>
      </section>
    </div>
  );
}

