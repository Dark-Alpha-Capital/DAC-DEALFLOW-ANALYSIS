import { createFileRoute, Link } from "@tanstack/react-router";
import AddInvestorLeadForm from "@/components/forms/add-investor-lead-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_protected/investor-leads/new")({
  head: () => ({
    meta: [{ title: "Add Investor Lead — Dark Alpha Capital" }],
  }),
  component: NewInvestorLeadRoute,
});

function NewInvestorLeadRoute() {
  return (
    <section className="big-container block-space-mini">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link to="/investor-leads">
            <ArrowLeft className="h-4 w-4" />
            Back to Investor Leads
          </Link>
        </Button>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add New Investor Lead
          </h1>
          <p className="text-muted-foreground text-sm">
            Add a raw investor lead for top-of-funnel tracking.
          </p>
        </header>

        <AddInvestorLeadForm />
      </div>
    </section>
  );
}
