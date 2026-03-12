import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Institutional dashboards for your deal pipeline.",
};

export default async function AnalyticsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <section className="block-space-mini group container">
      <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Institutional dashboards across investment themes, pipeline, sources, and AI
            screenings.
          </p>
        </div>
      </div>

      <AnalyticsDashboard />
    </section>
  );
}

