import { createFileRoute } from "@tanstack/react-router";
import { QuickAddDealForm } from "@/components/forms/quick-add-deal-form";

export const Route = createFileRoute(
  "/_protected/deal-opportunities/quick-add",
)({
  head: () => ({
    meta: [{ title: "Quick add deal — Dark Alpha Capital" }],
  }),
  component: QuickAddDealRoute,
});

function QuickAddDealRoute() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold md:text-4xl">Quick add deal</h1>
        <p className="text-muted-foreground">
          Capture a deal with key details now. You can always enrich it later.
        </p>
      </div>
      <div className="max-w-md">
        <QuickAddDealForm />
      </div>
    </section>
  );
}
