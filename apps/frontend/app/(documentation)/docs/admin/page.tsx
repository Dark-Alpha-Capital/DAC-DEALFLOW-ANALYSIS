export default function DocsAdminPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Admin access</h2>
        <p className="max-w-2xl text-muted-foreground">
          Admin pages are restricted for governance and platform operations. They are
          not intended for routine deal team workflows.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What admin currently supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>User-level administrative visibility through the admin dashboard.</li>
          <li>Role-based separation of standard users and admin users.</li>
          <li>Access control to operational modules where needed.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Who should use admin pages</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Platform owners and operations leads managing user access and controls.</li>
          <li>Selected technical or operational administrators.</li>
          <li>Not for day-to-day sourcing activity by associates or investment team members.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Governance guidance</h3>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Keep admin access tightly controlled. Periodically review who has admin rights and
          remove unnecessary access to reduce operational and compliance risk.
        </div>
      </section>
    </div>
  );
}
