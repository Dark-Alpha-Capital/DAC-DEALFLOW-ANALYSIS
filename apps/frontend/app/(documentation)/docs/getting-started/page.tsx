export default function DocsGettingStartedPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Getting started
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          This is placeholder content for a future onboarding guide. It will
          walk new users through logging in, exploring the dashboard, and
          understanding the main objects in the system.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Planned topics</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>How authentication works and where to log in.</li>
          <li>Overview of the main navigation and sidebar.</li>
          <li>
            Quick tour of key areas like dashboard, companies, documents, and
            screenings.
          </li>
          <li>Suggested first actions for a brand new user.</li>
        </ul>
      </section>
    </div>
  );
}

