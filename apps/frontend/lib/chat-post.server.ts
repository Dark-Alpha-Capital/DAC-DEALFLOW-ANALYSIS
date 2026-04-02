import "@tanstack/react-start/server-only";
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
import type { ChatSession } from "@repo/db";
import {
  buildFullChatSystemPrompt,
  getChatLanguageModel,
  resolveGoogleGeminiApiKey,
  resolveOpenAIApiKey,
} from "@repo/ai-core";
import {
  chatRequestBodySchema,
  type ChatRequestBody,
} from "@repo/schemas";
import { getSession } from "@/lib/auth-server";
import { coerceStoredMessages } from "@/lib/chat-messages";
import {
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

const badRequest = (message: string) =>
  Response.json({ error: message }, { status: 400 });

function dedupeMessagesById(messages: UIMessage[]): UIMessage[] {
  const deduped = new Map<string, UIMessage>();
  for (const message of messages) {
    deduped.set(message.id, message);
  }

  return [...deduped.values()];
}

function toolScope(chat: ChatSession) {
  return {
    companyId: chat.companyId,
    leadId: chat.leadId,
    dealOpportunityId: chat.dealOpportunityId,
  };
}

function createChatTools(chat: ChatSession) {
  const scope = toolScope(chat);
  return {
    resolveDiligenceScope: tool({
      description:
        "Resolve the due-diligence scope from chat context and optional deal/company hints.",
      inputSchema: diligenceScopeInputSchema,
      execute: async (input) => resolveDiligenceScope(input, scope),
    }),
    retrieveDiligenceEvidence: tool({
      description:
        "Retrieve due-diligence evidence from document chunks using hybrid retrieval (vector + keyword fallback).",
      inputSchema: retrieveDiligenceEvidenceInputSchema,
      execute: async (input) => retrieveDiligenceEvidence(input, scope),
    }),
    compareDiligenceEvidence: tool({
      description:
        "Compare retrieved evidence and detect cross-document discrepancies.",
      inputSchema: compareDiligenceEvidenceInputSchema,
      execute: async (input) => compareDiligenceEvidence(input, scope),
    }),
    runDiligenceChecks: tool({
      description:
        "Run deterministic diligence checks for discrepancy detection and document coverage gaps.",
      inputSchema: runDiligenceChecksInputSchema,
      execute: async (input) => runDiligenceChecks(input, scope),
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
      execute: async (input) => getEntityCounts(input, scope),
    }),
    listEntities: tool({
      description:
        "List business entities with optional search, filters, and pagination.",
      inputSchema: listEntitiesInputSchema,
      execute: async (input) => listEntities(input, scope),
    }),
    getEntityById: tool({
      description:
        "Fetch one entity by id with optional related information.",
      inputSchema: getEntityByIdInputSchema,
      execute: async (input) => getEntityById(input, scope),
    }),
    getDealOpportunityDossier: tool({
      description:
        "Fetch a complete deal opportunity dossier including financials, risk flags, screenings, and document metadata.",
      inputSchema: dealOpportunityDossierInputSchema,
      execute: async (input) => getDealOpportunityDossier(input, scope),
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
      execute: async (input) => getEntityDocuments(input, scope),
    }),
    queryBusinessData: tool({
      description:
        "Guarded generic business data reader. Supports count/list/getById/aggregate for business entities.",
      inputSchema: queryBusinessDataInputSchema,
      execute: async (input) => queryBusinessData(input, scope),
    }),
  };
}

function assertContextMatchesChat(
  context: NonNullable<ChatRequestBody["context"]>,
  chat: ChatSession,
): Response | null {
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
  return null;
}

export async function postChat(req: Request): Promise<Response> {
  const log = (msg: string, data?: unknown) => {
    console.log(`[chat] ${msg}`, data ?? "");
  };

  try {
    log("POST /api/chat started");

    const session = await getSession();
    log("session fetched", { hasSession: !!session, userId: session?.user?.id });

    if (!session?.user?.id) {
      log("unauthorized: no session or user id");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const parsed = chatRequestBodySchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Invalid request body",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { context, id, message: incomingMessage, model, provider: bodyProvider } =
      parsed.data;
    const message = incomingMessage as UIMessage;
    const provider: ChatProvider = bodyProvider ?? DEFAULT_CHAT_PROVIDER;

    log("body parsed", { id, provider, model, hasMessage: !!message });

    if (!isAllowedModel(provider, model)) {
      return badRequest("Unsupported model for provider.");
    }

    log("fetching chat session", { userId: session.user.id, chatId: id });
    const chat: ChatSession | null = await getChatSessionForUser(
      session.user.id,
      id,
    );
    if (!chat) {
      log("chat not found", { chatId: id });
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }
    log("chat session found");

    if (context) {
      const mismatch = assertContextMatchesChat(context, chat);
      if (mismatch) return mismatch;
    }

    const previousMessages = coerceStoredMessages(chat.messages);
    const mergedMessages = dedupeMessagesById([...previousMessages, message]);
    log("validating messages", { count: mergedMessages.length });

    const validatedMessages = await validateUIMessages({
      messages: mergedMessages,
    });
    log("messages validated");

    const openaiKey = resolveOpenAIApiKey();
    const googleKey = resolveGoogleGeminiApiKey();
    if (provider === "openai" && !openaiKey) {
      log("OPENAI_API_KEY or AI_API_KEY not set");
      return Response.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }
    if (provider === "google" && !googleKey) {
      log("GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_API_KEY not set");
      return Response.json(
        { error: "Google AI API key not configured" },
        { status: 500 },
      );
    }

    const languageModel = getChatLanguageModel(provider, model);
    log("calling streamText", { provider, model });

    const stream = streamText({
      model: languageModel,
      abortSignal: req.signal,
      system: buildFullChatSystemPrompt(),
      messages: await convertToModelMessages(validatedMessages),
      tools: createChatTools(chat),
      stopWhen: stepCountIs(8),
    });

    stream.consumeStream();

    log("returning stream response");
    return stream.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
      originalMessages: validatedMessages,
      generateMessageId: createIdGenerator({
        prefix: "msg",
        size: 16,
      }),
      onFinish: async ({
        isAborted,
        messages,
      }: {
        isAborted: boolean;
        messages: UIMessage[];
      }) => {
        try {
          await saveChatSessionMessages({
            userId: session.user.id,
            chatId: id,
            messages,
            provider,
            model,
          });
          log("messages saved on finish", { isAborted });
        } catch (err) {
          console.error("[chat] onFinish saveChatSessionMessages failed:", err);
        }
        if (isAborted) {
          return;
        }
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[chat] POST /api/chat error:", message, stack);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
