import { Metadata } from "next";
import AddDealForm from "@/components/forms/add-deal-form";

export const metadata: Metadata = {
  title: "Add New Deal",
  description: "Add a new deal opportunity to the database",
};

export default function NewDealPage() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1>Add New Deal</h1>
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
