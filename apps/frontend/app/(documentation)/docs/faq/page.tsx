export default function DocsFaqPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase text-primary">Docs</p>
        <h2 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
        <p className="max-w-2xl text-muted-foreground">
          Common operational questions from deal teams using the sourcing and pipeline platform.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">What is the difference between Leads and Deals?</h3>
          <p className="text-muted-foreground">
            Leads are raw inbound opportunities. Deals represent active, normalized deal opportunities
            progressing through pipeline stages.
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold">Why do we convert a lead into a company?</h3>
          <p className="text-muted-foreground">
            Company is the long-lived entity record. Converting prevents fragmented history and enables
            multiple opportunities to be tracked against one target business over time.
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold">Can one company have multiple deal opportunities?</h3>
          <p className="text-muted-foreground">
            Yes. The model supports repeated engagement cycles, which helps preserve context and avoid
            restarting analysis from scratch.
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold">How should we interpret AI screening?</h3>
          <p className="text-muted-foreground">
            Use AI screening as structured decision support, not a final verdict. Scores and sentiment
            should be reviewed with supporting explanations and partner judgment.
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold">What belongs in Company Notes vs Outreach?</h3>
          <p className="text-muted-foreground">
            Outreach logs interaction records and outcomes. Notes capture internal investment thinking,
            open questions, and synthesis from meetings or documents.
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold">Who should use Analytics?</h3>
          <p className="text-muted-foreground">
            Primarily team leads, principals, and partners for weekly/monthly operating reviews.
            Associates also benefit when prioritizing source channels and stage focus.
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold">What is the Jobs page used for?</h3>
          <p className="text-muted-foreground">
            Jobs tracks background tasks such as screening runs and file processing so teams can monitor
            completion, troubleshoot delays, and maintain process reliability.
          </p>
        </div>
      </section>
    </div>
  );
}
