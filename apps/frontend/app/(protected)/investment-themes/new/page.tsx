import { Metadata } from "next";
import AddThemeForm from "@/components/forms/add-theme-form";

export const metadata: Metadata = {
  title: "Add New Investment Theme",
  description: "Add a new investment theme to the database",
};

export default function NewThemePage() {
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
