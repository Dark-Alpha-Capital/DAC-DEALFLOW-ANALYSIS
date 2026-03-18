export default function DocsInvestorsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Investors</h2>
        <p className="max-w-2xl text-muted-foreground">
          The investors module is your system of record for capital relationships. It
          tracks who your investors are, what capital they can deploy, and how your
          team is engaging them over time.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">What this module supports</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Maintain a canonical profile for each investor (fund, family office, individual).</li>
          <li>Store capital profile details: check sizes, sectors, stages, and risk profile.</li>
          <li>Track relationship status from initial contact through active partnership or archive.</li>
          <li>Centralize contact details, geography, and primary relationship owner.</li>
          <li>Log interactions so outreach history and context are never lost.</li>
        </ul>
      </section>

      <section id="investor-leads" className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">
          Investor leads → investors
        </h3>
        <p className="text-muted-foreground">
          Investor leads represent potential capital relationships before you commit to
          full coverage. When conviction is high enough, you convert an investor lead
          into a full investor record.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Qualify the investor lead for mandate fit, relevance, and seriousness.</li>
          <li>Open the investor lead detail and choose the option to convert to investor.</li>
          <li>Review and edit the pre-filled investor fields for accuracy.</li>
          <li>Create the investor, which links back to the original investor lead for traceability.</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Best practice: only convert investor leads once you expect a multi-deal,
          recurring relationship, not for one-off, low-probability interest.
        </p>
      </section>

      <section id="interactions" className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Investor interactions</h3>
        <p className="text-muted-foreground">
          Interactions are the communication timeline with each investor. Use them to
          keep a clean record of outreach, feedback, and commitments.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Log emails, calls, meetings, and other touchpoints as interactions.</li>
          <li>Capture outcomes and key notes so future conversations start with context.</li>
          <li>Use interactions to understand engagement level before introducing new deals.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">Recommended workflow</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Start with investor leads for new names and light-touch interest.</li>
          <li>Convert qualified investor leads into investors once relationship depth increases.</li>
          <li>Keep investor profiles and capital preferences current after major updates.</li>
          <li>Log interactions after every material touchpoint to maintain relationship memory.</li>
        </ol>
      </section>
    </div>
  );
}

