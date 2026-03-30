import { createFileRoute, Link } from "@tanstack/react-router";
import AddInvestorForm from "@/components/forms/add-investor-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_protected/investors/new")({
  head: () => ({
    meta: [{ title: "Add Investor — Dark Alpha Capital" }],
  }),
  component: NewInvestorRoute,
});

function NewInvestorRoute() {
  return (
    <section className="big-container block-space-mini">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link to="/investors">
            <ArrowLeft className="h-4 w-4" />
            Back to Investors
          </Link>
        </Button>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add New Investor
          </h1>
          <p className="text-muted-foreground text-sm">
            Add a qualified investor with profile and capital preferences.
          </p>
        </header>

        <AddInvestorForm />
      </div>
    </section>
  );
}
