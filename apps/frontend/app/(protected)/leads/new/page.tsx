import { Metadata } from "next";
import AddLeadForm from "@/components/forms/add-lead-form";

export const metadata: Metadata = {
  title: "Add New Lead",
  description: "Add a new lead to the database",
};

export default function NewLeadPage() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1>Add New Lead</h1>
        <p className="text-muted-foreground">
          Add a new lead manually with listing and broker details.
        </p>
      </div>
      <div className="">
        <AddLeadForm />
      </div>
    </section>
  );
}
