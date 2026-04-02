import { createFileRoute } from "@tanstack/react-router";
import AddCompanyForm from "@/components/forms/add-company-form";

export const Route = createFileRoute("/_protected/companies/new")({
  head: () => ({
    meta: [{ title: "Add Company — Dark Alpha Capital" }],
  }),
  component: NewCompanyRoute,
});

function NewCompanyRoute() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1>Add New Company</h1>
        <p className="text-muted-foreground">
          Add a new company manually with basic and financial details.
        </p>
      </div>
      <div className="">
        <AddCompanyForm />
      </div>
    </section>
  );
}
