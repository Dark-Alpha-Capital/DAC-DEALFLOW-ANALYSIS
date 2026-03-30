import { createServerFn } from "@tanstack/react-start";
import { GetDealOpportunitiesWithScreenings } from "@repo/db/queries";

export const loadScreeningsPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    const raw = await GetDealOpportunitiesWithScreenings();
    const items = raw.map((row) => ({
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
    return { items };
  },
);
