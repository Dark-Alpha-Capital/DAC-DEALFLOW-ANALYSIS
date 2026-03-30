import { createFileRoute } from "@tanstack/react-router";
import AddThemeForm from "@/components/forms/add-theme-form";

export const Route = createFileRoute("/_protected/investment-themes/new")({
  head: () => ({
    meta: [{ title: "Add Investment Theme — Dark Alpha Capital" }],
  }),
  component: NewThemeRoute,
});

function NewThemeRoute() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1>Add New Investment Theme</h1>
        <p className="text-muted-foreground">
          Add a new investment theme with sector and description.
        </p>
      </div>
      <div className="">
        <AddThemeForm />
      </div>
    </section>
  );
}
