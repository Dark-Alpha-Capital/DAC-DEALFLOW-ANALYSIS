import { streamObject } from "ai";
import { bitrixDealOpportunityExtractionSchema } from "@repo/bitrix-sync";
import { getChatLanguageModel } from "@repo/ai-core";
import { getSession } from "@/lib/auth-server";

const MAX_RAW_TEXT_CHARS = 120_000;

const SYSTEM = `You extract structured deal data from unstructured text (emails, teasers, notes).
You MUST return every JSON key; use null for unknown values (never omit keys).
Numbers must be plain decimals (no currency symbols). Title should be short and suitable for a CRM deal name.
Distinguish company revenue (TTM/annual) from deal value: put revenue in "revenue" and transaction size in "opportunity".
Use "teaser" for a one-line hook and "description" for a longer narrative; put leftover notes in "comments".
Extract sourceWebsite whenever any URL or domain appears; null only if the text has no web reference.`;

export async function postAiBitrixExtract(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawText =
    typeof body === "object" &&
    body !== null &&
    "rawText" in body &&
    typeof (body as { rawText: unknown }).rawText === "string"
      ? (body as { rawText: string }).rawText
      : null;

  if (rawText == null) {
    return Response.json({ error: "rawText is required" }, { status: 400 });
  }

  const trimmed = rawText.trim();
  if (trimmed.length === 0) {
    return Response.json({ error: "rawText must not be empty" }, { status: 400 });
  }

  const text =
    trimmed.length > MAX_RAW_TEXT_CHARS
      ? `${trimmed.slice(0, MAX_RAW_TEXT_CHARS)}\n\n[Truncated…]`
      : trimmed;

  const result = streamObject({
    model: getChatLanguageModel("openai", "gpt-4.1-mini"),
    schema: bitrixDealOpportunityExtractionSchema,
    system: SYSTEM,
    prompt: `Extract deal fields from the following text:\n\n---\n\n${text}`,
    abortSignal: request.signal,
  });

  return result.toTextStreamResponse();
}
