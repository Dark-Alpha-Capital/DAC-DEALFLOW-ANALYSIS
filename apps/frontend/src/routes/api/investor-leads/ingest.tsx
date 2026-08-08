import { createFileRoute } from "@tanstack/react-router";
import db, { investorLeads } from "@repo/db";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";
import { z } from "zod";
import { getServerEnv } from "@/lib/env.server";
import { isAuthorizedByApiKey } from "@/lib/server/api-key-auth";

const investorLeadStatusEnum = z.enum([
  "RAW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "REJECTED",
]);

const investorLeadIngestSchema = z.object({
  name: z.string().optional(),
  source: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  inferredType: z.string().optional(),
  notes: z.string().optional(),
  status: investorLeadStatusEnum.optional(),
});

async function postInvestorLeadsIngest(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (
      !isAuthorizedByApiKey(
        request,
        body as Record<string, unknown>,
        "x-investor-leads-api-key",
        getServerEnv().INVESTOR_LEADS_API_KEY,
      )
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey: _, ...leadData } = body as Record<string, unknown>;
    const parsed = investorLeadIngestSchema.safeParse(leadData);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const [added] = await db
      .insert(investorLeads)
      .values({
        name: input.name ?? null,
        source: input.source ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        inferredType: input.inferredType ?? null,
        notes: input.notes ?? null,
        status: input.status ?? "RAW",
      })
      .returning();

    if (!added) {
      return Response.json(
        { error: "Failed to create investor lead" },
        { status: 500 },
      );
    }

    return Response.json(
      { investorLeadId: added.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("[investor-leads/ingest] Error:", error);
    return Response.json(
      {
        error: "Failed to ingest investor lead",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/investor-leads/ingest")({
  server: {
    handlers: {
      POST: ({ request }) =>
        withWorkerDbIfNeeded(() => postInvestorLeadsIngest(request)),
    },
  },
});
