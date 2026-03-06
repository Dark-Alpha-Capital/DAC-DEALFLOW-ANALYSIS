import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { GetDealOpportunitiesWithScreenings } from "@repo/db/queries";
import ScreeningScoreCard from "@/components/ScreeningScoreCard";
import ScreenerResultsList from "@/components/ScreenerResultsList";

export const metadata: Metadata = {
  title: "Screenings",
  description: "AI screening results across the deal pipeline",
};

export default async function ScreeningsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <section className="block-space-mini container">
      <div className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">
          Screening Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI analysis across all screened deal opportunities.
        </p>
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading screenings…</div>}>
        <ScreeningsContent />
      </Suspense>
    </section>
  );
}

type ScreeningDeal = {
  id: string;
  stage: string;
  status: string;
  companyName: string | null;
  companyLocation: string | null;
  companyIndustry: string | null;
  revenue: number | null;
  ebitda: number | null;
  screenings: {
    id: string;
    title: string;
    sentiment: string;
    score: number | null;
    explanation: string;
    createdAt: string;
  }[];
};

async function ScreeningsContent() {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");

  const raw = await GetDealOpportunitiesWithScreenings();

  const items: ScreeningDeal[] = raw.map((row) => ({
    id: row.opportunity.id,
    stage: row.opportunity.stage,
    status: row.opportunity.status,
    companyName: row.company?.name ?? null,
    companyLocation: row.company?.location ?? null,
    companyIndustry: row.company?.industry ?? null,
    revenue: row.opportunity.revenue ?? null,
    ebitda: row.opportunity.ebitda ?? null,
    screenings: row.screenings.map((s) => ({
      id: s.id,
      title: s.title,
      sentiment: s.sentiment,
      score: s.score,
      explanation: s.explanation,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-4">
      <ScreeningScoreCard items={items} />
      <ScreenerResultsList items={items} />
    </div>
  );
}

