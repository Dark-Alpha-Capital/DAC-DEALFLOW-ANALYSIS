import type { Metadata } from "next";
import { QuickAddDealForm } from "@/components/forms/quick-add-deal-form";

export const metadata: Metadata = {
  title: "Quick add deal",
  description: "Quickly add a new deal opportunity.",
};

export default function QuickAddDealPage() {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold md:text-4xl">
          Quick add deal
        </h1>
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

