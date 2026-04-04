import { createFileRoute } from "@tanstack/react-router";
import { createId } from "@paralleldrive/cuid2";
import { timingSafeEqual } from "crypto";
import db, { companies, dealOpportunities } from "@repo/db";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import { dealQuickAddApiSchema } from "@/lib/zod-schemas/deal-quick-add-api";
import { getServerEnv } from "@/lib/env.server";

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

function validateApiKey(provided: string): boolean {
  const expected = getServerEnv().DEAL_QUICK_ADD_API_KEY;
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  } catch {
    return false;
  }
}

function getApiKeyFromRequest(
  request: Request,
  body: Record<string, unknown>,
): string | null {
  const header = request.headers.get("x-deal-quick-add-api-key");
  if (header) return header;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  if (body && typeof body.apiKey === "string") return body.apiKey;

  return null;
}

async function postDealOpportunitiesQuickAdd(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = getApiKeyFromRequest(request, body as Record<string, unknown>);

    if (!apiKey || !validateApiKey(apiKey)) {
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
      const name = (
        input.companyName?.trim() || input.dealTeaser
      ).trim().slice(0, 255);
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
          dealTeaser: input.dealTeaser || null,
          description: input.description || null,
          brokerFirstName: input.brokerFirstName || null,
          brokerLastName: input.brokerLastName || null,
          brokerEmail: input.brokerEmail || null,
          brokerPhone: input.brokerPhone || null,
          brokerLinkedIn: input.brokerLinkedIn || null,
          userId: null,
        })
        .returning();

      if (!opp) {
        throw new Error("Failed to create deal opportunity");
      }

      return { company, opp };
    });

    revalidatePath("/deal-opportunities");
    revalidatePath(`/deal-opportunities/${result.opp.id}`);
    revalidatePath(`/companies/${result.company.id}`);
    revalidateTag("deals", "max");
    revalidateTag("companies", "max");

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
