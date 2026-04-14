import { createFileRoute } from "@tanstack/react-router";
import { Output, streamText } from "ai";
import {
  BITRIX_DEAL_OPPORTUNITY_EXTRACTION_SYSTEM,
  getChatLanguageModel,
  resolveOpenAIApiKey,
} from "@repo/ai-core";
import { bitrixDealOpportunityExtractionSchema } from "@repo/bitrix-sync";

const OPENAI_EXTRACT_MODEL = "gpt-4.1-mini";

export const Route = createFileRoute(
  "/api/deal-opportunities/ai-bitrix-extract",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!resolveOpenAIApiKey()) {
          return Response.json(
            { error: "OpenAI API key not configured for extraction" },
            { status: 503 },
          );
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
          return Response.json(
            { error: "rawText is required" },
            { status: 400 },
          );
        }

        const trimmed = rawText.trim();
        if (trimmed.length === 0) {
          return Response.json(
            { error: "rawText must not be empty" },
            { status: 400 },
          );
        }

        const result = streamText({
          model: getChatLanguageModel("openai", OPENAI_EXTRACT_MODEL),
          system: BITRIX_DEAL_OPPORTUNITY_EXTRACTION_SYSTEM,
          prompt: `Extract deal fields from the following text:\n\n---\n\n${trimmed}`,
          output: Output.object({
            name: "BitrixDealOpportunityExtraction",
            description:
              "Structured Bitrix deal fields extracted from unstructured text (emails, teasers, notes).",
            schema: bitrixDealOpportunityExtractionSchema,
          }),
          abortSignal: request.signal,
          onError({ error }) {
            console.error("[ai-bitrix-extract] streamText (openai)", error);
          },
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
