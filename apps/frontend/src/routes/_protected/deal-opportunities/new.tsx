import { createFileRoute } from "@tanstack/react-router";
import AddDealForm from "@/components/forms/add-deal-form";

export const Route = createFileRoute("/_protected/deal-opportunities/new")({
  head: () => ({
    meta: [{ title: "Add deal opportunity — Dark Alpha Capital" }],
  }),
  component: NewDealOpportunityRoute,
});

function NewDealOpportunityRoute() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1>Add deal opportunity</h1>
        <p className="text-muted-foreground">
          Add a new deal opportunity. Select an existing company to link.
        </p>
      </div>
      <div className="">
        <AddDealForm />
      </div>
    </section>
  );
}
