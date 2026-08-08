import { createFileRoute } from "@tanstack/react-router";
import db, { leads } from "@repo/db";
import { upsertLeadScreening } from "@repo/deal-screening";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";
import { leadFormSchema } from "@/lib/schemas";
import { getServerEnv } from "@/lib/env.server";
import { isAuthorizedByApiKey } from "@/lib/server/api-key-auth";

async function postLeadsIngest(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (
      !isAuthorizedByApiKey(
        request,
        body as Record<string, unknown>,
        "x-gtm-api-key",
        getServerEnv().GTM_LEADS_API_KEY,
      )
    ) {
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

    if (!added) {
      return Response.json(
        { error: "Failed to create lead" },
        { status: 500 },
      );
    }

    await upsertLeadScreening(added.id);

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
