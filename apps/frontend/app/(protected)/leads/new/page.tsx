import { Metadata } from "next";
import AddLeadForm from "@/components/forms/add-lead-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Add New Lead",
  description: "Add a new lead to the database",
};

export default function NewLeadPage() {
  return (
    <section className="big-container block-space-mini">
      <div className="space-y-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 pl-0 transition-all hover:pl-2"
        >
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Link>
        </Button>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add New Lead
          </h1>
          <p className="text-muted-foreground text-sm">
            Add a new lead manually with listing and broker details.
          </p>
        </header>

        <AddLeadForm />
      </div>
    </section>
  );
}
