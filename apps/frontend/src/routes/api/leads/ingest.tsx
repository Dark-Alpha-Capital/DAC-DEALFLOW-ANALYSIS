import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import db, { leads } from "@repo/db";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";
import { revalidatePath, revalidateTag } from "@/lib/cache-invalidation";
import { leadFormSchema } from "@/lib/schemas";

function validateApiKey(provided: string): boolean {
  const expected = process.env.GTM_LEADS_API_KEY;
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
  const header = request.headers.get("x-gtm-api-key");
  if (header) return header;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  if (body && typeof body.apiKey === "string") return body.apiKey;

  return null;
}

async function postLeadsIngest(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = getApiKeyFromRequest(request, body as Record<string, unknown>);

    if (!apiKey || !validateApiKey(apiKey)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey: _, ...leadData } = body as Record<string, unknown>;
    const parsed = leadFormSchema.safeParse(leadData);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const [added] = await db
      .insert(leads)
      .values({
        sourceWebsite: input.sourceWebsite,
        externalListingId: input.externalListingId,
        rawTitle: input.rawTitle,
        rawDescription: input.rawDescription,
        rawIndustry: input.rawIndustry,
        revenue: input.revenue,
        ebitda: input.ebitda,
        askingPrice: input.askingPrice,
        brokerage: input.brokerage,
        brokerFirstName: input.brokerFirstName,
        brokerLastName: input.brokerLastName,
        brokerEmail: input.brokerEmail || null,
        brokerPhone: input.brokerPhone,
        normalizedCompanyName: input.normalizedCompanyName,
        companyLocation: input.companyLocation,
      })
      .returning();

    revalidatePath("/leads");
    revalidateTag("leads", "max");

    if (!added) {
      return Response.json(
        { error: "Failed to create lead" },
        { status: 500 },
      );
    }

    return Response.json({ leadId: added.id }, { status: 201 });
  } catch (error) {
    console.error("[leads/ingest] Error:", error);
    return Response.json(
      {
        error: "Failed to ingest lead",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/leads/ingest")({
  server: {
    handlers: {
      POST: ({ request }) => withWorkerDbIfNeeded(() => postLeadsIngest(request)),
    },
  },
});
