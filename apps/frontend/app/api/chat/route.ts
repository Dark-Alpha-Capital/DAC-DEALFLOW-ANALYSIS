import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  validateUIMessages,
} from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { getSession } from "@/lib/auth-server";
import {
  coerceStoredMessages,
  getChatSessionForUser,
  saveChatSessionMessages,
} from "@/lib/chat-store";
import {
  DEFAULT_CHAT_PROVIDER,
  isAllowedModel,
  type ChatProvider,
} from "@/lib/chat-models";
import {
  dealOpportunityDossierInputSchema,
  entityCountsInputSchema,
  entityDocumentsInputSchema,
  getDealOpportunityDossier,
  getEntityById,
  getEntityCounts,
  getEntityDocuments,
  getInvestmentThemeDossier,
  getEntityByIdInputSchema,
  listEntities,
  listEntitiesInputSchema,
  queryBusinessData,
  queryBusinessDataInputSchema,
  themeDossierInputSchema,
} from "@/lib/chat-db-tools";
import {
  buildDiligenceSystemPrompt,
  compareDiligenceEvidence,
  compareDiligenceEvidenceInputSchema,
  diligenceScopeInputSchema,
  resolveDiligenceScope,
  retrieveDiligenceEvidence,
  retrieveDiligenceEvidenceInputSchema,
  runDiligenceChecks,
  runDiligenceChecksInputSchema,
  summarizeDiligenceFindings,
  summarizeDiligenceFindingsInputSchema,
} from "@/lib/chat-diligence-tools";

export const maxDuration = 30;

type ChatRequestBody = {
  id: string;
  message: UIMessage;
  provider?: ChatProvider;
  model: string;
  context?: {
    companyId?: string | null;
    leadId?: string | null;
    dealOpportunityId?: string | null;
  };
};

const badRequest = (message: string) =>
  Response.json({ error: message }, { status: 400 });

function dedupeMessagesById(messages: UIMessage[]): UIMessage[] {
  const deduped = new Map<string, UIMessage>();
  for (const message of messages) {
    deduped.set(message.id, message);
  }
  return [...deduped.values()];
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ChatRequestBody;
  const provider = body.provider ?? DEFAULT_CHAT_PROVIDER;
  const { context, id, message, model } = body;

  if (!id || typeof id !== "string") {
    return badRequest("`id` must be a chat id string.");
  }

  if (provider !== "openai" && provider !== "google") {
    return badRequest("`provider` must be either `openai` or `google`.");
  }

  if (!message || typeof message !== "object") {
    return badRequest("`message` is required.");
  }

  if (!model || typeof model !== "string") {
    return badRequest("`model` must be a string.");
  }

  if (context != null) {
    if (typeof context !== "object") {
      return badRequest("`context` must be an object when provided.");
    }

    const contextKeys: Array<keyof NonNullable<ChatRequestBody["context"]>> = [
      "companyId",
      "leadId",
      "dealOpportunityId",
    ];

    for (const key of contextKeys) {
      const value = context[key];
      if (value != null && typeof value !== "string") {
        return badRequest(`\`context.${key}\` must be a string or null.`);
      }
    }
  }

  if (!isAllowedModel(provider, model)) {
    return badRequest("Unsupported model for provider.");
  }

  const chat = await getChatSessionForUser(session.user.id, id);
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  if (context) {
    if (context.companyId != null && context.companyId !== chat.companyId) {
      return badRequest("`context.companyId` does not match chat context.");
    }
    if (context.leadId != null && context.leadId !== chat.leadId) {
      return badRequest("`context.leadId` does not match chat context.");
    }
    if (
      context.dealOpportunityId != null &&
      context.dealOpportunityId !== chat.dealOpportunityId
    ) {
      return badRequest(
        "`context.dealOpportunityId` does not match chat context.",
      );
    }
  }

  const previousMessages = coerceStoredMessages(chat.messages);
  const mergedMessages = dedupeMessagesById([...previousMessages, message]);
  const validatedMessages = await validateUIMessages({
    messages: mergedMessages,
  });

  const resolvedModel =
    provider === "openai" ? openai(model) : google(model);

  const result = streamText({
    model: resolvedModel,
    abortSignal: req.signal,
    system: `${buildDiligenceSystemPrompt()} Prefer these tools for data-backed responses: resolveDiligenceScope, retrieveDiligenceEvidence, compareDiligenceEvidence, runDiligenceChecks, summarizeDiligenceFindings, getDealOpportunityDossier, getEntityDocuments, getEntityCounts, queryBusinessData. Use evidence-first responses and cite documentId/chunkId in outputs.`,
    messages: await convertToModelMessages(validatedMessages),
    tools: {
      resolveDiligenceScope: tool({
        description:
          "Resolve the due-diligence scope from chat context and optional deal/company hints.",
        inputSchema: diligenceScopeInputSchema,
        execute: async (input) =>
          resolveDiligenceScope(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      retrieveDiligenceEvidence: tool({
        description:
          "Retrieve due-diligence evidence from document chunks using hybrid retrieval (vector + keyword fallback).",
        inputSchema: retrieveDiligenceEvidenceInputSchema,
        execute: async (input) =>
          retrieveDiligenceEvidence(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      compareDiligenceEvidence: tool({
        description:
          "Compare retrieved evidence and detect cross-document discrepancies.",
        inputSchema: compareDiligenceEvidenceInputSchema,
        execute: async (input) =>
          compareDiligenceEvidence(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      runDiligenceChecks: tool({
        description:
          "Run deterministic diligence checks for discrepancy detection and document coverage gaps.",
        inputSchema: runDiligenceChecksInputSchema,
        execute: async (input) =>
          runDiligenceChecks(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      summarizeDiligenceFindings: tool({
        description:
          "Produce a structured due-diligence report summary from findings/discrepancies.",
        inputSchema: summarizeDiligenceFindingsInputSchema,
        execute: async (input) => summarizeDiligenceFindings(input),
      }),
      getEntityCounts: tool({
        description:
          "Get counts of business entities such as leads, companies, themes, screeners, deal opportunities, and documents.",
        inputSchema: entityCountsInputSchema,
        execute: async (input) =>
          getEntityCounts(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      listEntities: tool({
        description:
          "List business entities with optional search, filters, and pagination.",
        inputSchema: listEntitiesInputSchema,
        execute: async (input) =>
          listEntities(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      getEntityById: tool({
        description:
          "Fetch one entity by id with optional related information.",
        inputSchema: getEntityByIdInputSchema,
        execute: async (input) =>
          getEntityById(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      getDealOpportunityDossier: tool({
        description:
          "Fetch a complete deal opportunity dossier including financials, risk flags, screenings, and document metadata.",
        inputSchema: dealOpportunityDossierInputSchema,
        execute: async (input) =>
          getDealOpportunityDossier(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      getInvestmentThemeDossier: tool({
        description:
          "Fetch complete investment theme data, including active thesis, industry intelligence, coverage, and related document metadata.",
        inputSchema: themeDossierInputSchema,
        execute: async (input) => getInvestmentThemeDossier(input),
      }),
      getEntityDocuments: tool({
        description:
          "Fetch document metadata for an entity. Extracted text is optional and off by default.",
        inputSchema: entityDocumentsInputSchema,
        execute: async (input) =>
          getEntityDocuments(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
      queryBusinessData: tool({
        description:
          "Guarded generic business data reader. Supports count/list/getById/aggregate for business entities.",
        inputSchema: queryBusinessDataInputSchema,
        execute: async (input) =>
          queryBusinessData(input, {
            companyId: chat.companyId,
            leadId: chat.leadId,
            dealOpportunityId: chat.dealOpportunityId,
          }),
      }),
    },
    stopWhen: stepCountIs(8),
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse({
    consumeSseStream: consumeStream,
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    onFinish: async ({ isAborted, messages }) => {
      // Keep partial assistant output when a response is stopped by the user.
      // This preserves transcript continuity and allows explicit regeneration.
      await saveChatSessionMessages({
        userId: session.user.id,
        chatId: id,
        messages,
        provider,
        model,
      });

      if (isAborted) {
        return;
      }
    },
  });
}
