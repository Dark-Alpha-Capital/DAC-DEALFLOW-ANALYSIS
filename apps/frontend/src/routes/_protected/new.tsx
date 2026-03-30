import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/new")({
  head: () => ({
    meta: [{ title: "Add New Deal — Dark Alpha Capital" }],
  }),
  component: NewDealPage,
});

function NewDealPage() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6 text-center">
        <h1>Add New Deal</h1>
        <p>
          Add a new Deal to the Database by bulk importing or adding it manually
        </p>
      </div>

      <Link to="/leads/new">Add New Lead</Link>
    </section>
  );
}
