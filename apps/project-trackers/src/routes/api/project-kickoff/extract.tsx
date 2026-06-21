import { createFileRoute } from "@tanstack/react-router";
import { Output, streamText } from "ai";
import {
  PROJECT_KICKOFF_EXTRACTION_SYSTEM,
  getChatLanguageModel,
  resolveOpenAIApiKey,
} from "@repo/ai-core";
import { projectKickoffExtractionSchema } from "@repo/schemas";
import { requireKickoffSession } from "@/lib/server/require-kickoff-session";

const OPENAI_EXTRACT_MODEL = "gpt-4.1-mini";

export const Route = createFileRoute("/api/project-kickoff/extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireKickoffSession(request);
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

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
          system: PROJECT_KICKOFF_EXTRACTION_SYSTEM,
          prompt: `Extract project kickoff fields from the following text:\n\n---\n\n${trimmed}`,
          output: Output.object({
            name: "ProjectKickoffExtraction",
            description:
              "Structured project kickoff fields extracted from unstructured text (meeting notes, documents, emails).",
            schema: projectKickoffExtractionSchema,
          }),
          abortSignal: request.signal,
          onError({ error }) {
            console.error(
              "[project-kickoff-extract] streamText (openai)",
              error,
            );
          },
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
