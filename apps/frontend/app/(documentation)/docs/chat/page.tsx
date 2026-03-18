export default function DocsChatPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-primary text-sm font-medium uppercase">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">AI assistant</h2>
        <p className="text-muted-foreground max-w-2xl">
          The chatbot is your natural-language interface to the underlying
          database. It can read across leads, companies, deals, themes, and
          investors, and return structured answers so the team can move faster.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">
          What this module supports
        </h3>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>Ask free-form questions about any entity in the system.</li>
          <li>
            Retrieve lists and summaries (for example: &quot;show investors
            interested in healthcare with a minimum check size above
            $500k&quot;).
          </li>
          <li>
            Explore relationships between objects (for example: &quot;which
            investors have interacted with this company in the last
            quarter?&quot;).
          </li>
          <li>
            Get structured responses that align to your schema, not just plain
            text answers.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">
          How context works in chat
        </h3>
        <p className="text-muted-foreground">
          When you open chat from a specific lead, company, deal, or investor,
          the assistant is aware of that context. You can then ask follow-up
          questions without restating identifiers.
        </p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            Opening chat from an entity record passes that entity into the
            session.
          </li>
          <li>
            You can still ask global questions that span multiple entities and
            the assistant will read across the database.
          </li>
          <li>
            Use plain language; the assistant translates your intent into
            structured queries against the underlying data model.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight">
          Example prompts for database read
        </h3>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            &quot;List investor leads converted to investors in the last 30
            days, grouped by status.&quot;
          </li>
          <li>
            &quot;Summarize recent interactions for this investor and highlight
            open follow-ups.&quot;
          </li>
          <li>
            &quot;Show companies where this investor&apos;s capital profile is a
            strong fit.&quot;
          </li>
          <li>
            &quot;Give me a structured table of all active investors, their
            check sizes, and preferred stages.&quot;
          </li>
        </ul>
        <p className="text-muted-foreground text-sm">
          Treat the assistant as a query layer over your entities. The more
          precise your questions, the more actionable the structured responses
          will be.
        </p>
      </section>
    </div>
  );
}
