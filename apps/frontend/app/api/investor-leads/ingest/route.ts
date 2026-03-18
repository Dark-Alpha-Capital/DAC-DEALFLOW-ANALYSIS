import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";
import db, { investorLeads } from "@repo/db";
import { z } from "zod";

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

function validateApiKey(provided: string): boolean {
  const expected = process.env.INVESTOR_LEADS_API_KEY;
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
  request: NextRequest,
  body: Record<string, unknown>,
): string | null {
  const header = request.headers.get("x-investor-leads-api-key");
  if (header) return header;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  if (body && typeof body.apiKey === "string") return body.apiKey;

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = getApiKeyFromRequest(request, body as Record<string, unknown>);

    if (!apiKey || !validateApiKey(apiKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey: _, ...leadData } = body as Record<string, unknown>;
    const parsed = investorLeadIngestSchema.safeParse(leadData);

    if (!parsed.success) {
      return NextResponse.json(
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

    revalidatePath("/investor-leads");
    revalidateTag("investor-leads", "max");

    if (!added) {
      return NextResponse.json(
        { error: "Failed to create investor lead" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { investorLeadId: added.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("[investor-leads/ingest] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest investor lead",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
