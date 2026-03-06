import { Metadata } from "next";
import AddCompanyForm from "@/components/forms/add-company-form";

export const metadata: Metadata = {
  title: "Add New Company",
  description: "Add a new company to the database",
};

export default function NewCompanyPage() {
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
