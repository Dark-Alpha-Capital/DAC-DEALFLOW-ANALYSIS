import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
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
    system:
      "You are a private-equity ops assistant for internal business data. Prefer these database tools before answering: getEntityCounts, listEntities, getEntityById, getDealOpportunityDossier, getInvestmentThemeDossier, getEntityDocuments, queryBusinessData. Always use tools for questions about leads, companies, themes, screeners, deal opportunities, financials, screenings, and documents. Do not invent database facts.",
    messages: await convertToModelMessages(validatedMessages),
    tools: {
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
