import { createFileRoute } from "@tanstack/react-router";
import { createId } from "@paralleldrive/cuid2";
import db, { companies, dealOpportunities } from "@repo/db";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";
import { dealQuickAddApiSchema } from "@/lib/zod-schemas/deal-quick-add-api";
import { getServerEnv } from "@/lib/env.server";
import { isAuthorizedByApiKey } from "@/lib/server/api-key-auth";
import { defaultBitrixStageId } from "@repo/bitrix-sync";

function normalizeCompanyNameKey(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildNormalizedNameForQuickAdd(
  companyName: string,
  location?: string | null,
): string {
  const base = normalizeCompanyNameKey(companyName);
  const loc = normalizeCompanyNameKey(location ?? "");
  const suffix = createId().replace(/-/g, "").slice(0, 12);
  const parts = [base || "company", loc || null, suffix].filter(Boolean) as string[];
  return parts.join("_").slice(0, 240);
}

async function postDealOpportunitiesQuickAdd(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (
      !isAuthorizedByApiKey(
        request,
        body as Record<string, unknown>,
        "x-deal-quick-add-api-key",
        getServerEnv().DEAL_QUICK_ADD_API_KEY,
      )
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey: _discard, ...payload } = body as Record<string, unknown>;
    const parsed = dealQuickAddApiSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;

    const result = await db.transaction(async (tx) => {
      const headline =
        input.title?.trim() || input.dealTeaser?.trim() || "";
      const name = (input.companyName?.trim() || headline).trim().slice(0, 255);
      const normalizedName = buildNormalizedNameForQuickAdd(
        name,
        input.location?.trim() || null,
      );

      const [company] = await tx
        .insert(companies)
        .values({
          name,
          normalizedName,
          industry: input.industry?.trim() || null,
          location: input.location?.trim() || null,
          coverageStatus: "UNCONTACTED",
        })
        .returning();

      if (!company) {
        throw new Error("Failed to create company");
      }

      const [opp] = await tx
        .insert(dealOpportunities)
        .values({
          companyId: company.id,
          leadId: null,
          sourceWebsite: input.sourceWebsite || null,
          brokerage: input.brokerage || null,
          revenue: null,
          ebitda: null,
          ebitdaMargin: null,
          askingPrice: null,
          title: headline || null,
          dealTeaser:
            input.title?.trim() && input.dealTeaser?.trim()
              ? input.dealTeaser.trim()
              : null,
          description: input.description || null,
          brokerFirstName: input.brokerFirstName || null,
          brokerLastName: input.brokerLastName || null,
          brokerEmail: input.brokerEmail || null,
          brokerPhone: input.brokerPhone || null,
          brokerLinkedIn: input.brokerLinkedIn || null,
          userId: null,
          stage: defaultBitrixStageId(),
        })
        .returning();

      if (!opp) {
        throw new Error("Failed to create deal opportunity");
      }

      return { company, opp };
    });

    return Response.json(
      {
        dealOpportunityId: result.opp.id,
        companyId: result.company.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[deal-opportunities/quick-add] Error:", error);
    return Response.json(
      {
        error: "Failed to quick add deal",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/deal-opportunities/quick-add")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withWorkerDbIfNeeded(() => postDealOpportunitiesQuickAdd(request)),
    },
  },
});
