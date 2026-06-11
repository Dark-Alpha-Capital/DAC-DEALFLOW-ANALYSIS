import "@tanstack/react-start/server-only";
import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  InvalidToolInputError,
  NoSuchToolError,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
  validateUIMessages,
} from "ai";
import { env } from "cloudflare:workers";
import { runDbWithD1, type ChatSession } from "@repo/db";
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
  getDealLinkedCompanies,
  getDealLinkedCompaniesInputSchema,
  getDealLinkedInvestors,
  getDealLinkedInvestorsInputSchema,
  getDealRelationshipCounts,
  getDealRelationshipCountsInputSchema,
  getDealCimAnalysis,
  getDealCimAnalysisInputSchema,
  getDealScreeningTemplateQuestions,
  getDealScreeningTemplateQuestionsInputSchema,
  getEntityById,
  getEntityCounts,
  getEntityDocuments,
  getInvestmentThemeDossier,
  getScreenerQuestionsForChat,
  getScreenerQuestionsInputSchema,
  getEntityByIdInputSchema,
  getCimScreeningRunAnswers,
  getCimScreeningRunAnswersInputSchema,
  getCimScreeningSessionDetail,
  getCimScreeningSessionDetailInputSchema,
  listScreenedDealOpportunities,
  listScreenedDealOpportunitiesInputSchema,
  listScreeners,
  listDealScreeningTemplates,
  listDealScreeningTemplatesInputSchema,
  listScreenersInputSchema,
  listEntities,
  listEntitiesInputSchema,
  listCimScreeningRuns,
  listCimScreeningRunsInputSchema,
  listCimScreeningSessions,
  listCimScreeningSessionsInputSchema,
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
import { getServerEnv } from "@/lib/env.server";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";

const badRequest = (message: string) =>
  Response.json({ error: message }, { status: 400 });

type ChatToolName =
  | "resolveDiligenceScope"
  | "retrieveDiligenceEvidence"
  | "compareDiligenceEvidence"
  | "runDiligenceChecks"
  | "summarizeDiligenceFindings"
  | "getEntityCounts"
  | "listEntities"
  | "getEntityById"
  | "getDealOpportunityDossier"
  | "getInvestmentThemeDossier"
  | "getEntityDocuments"
  | "queryBusinessData"
  | "listCimScreeningSessions"
  | "listScreenedDealOpportunities"
  | "listCimScreeningRuns"
  | "getCimScreeningRunAnswers"
  | "getCimScreeningSessionDetail"
  | "listScreeners"
  | "getScreenerQuestions"
  | "listDealScreeningTemplates"
  | "getDealScreeningTemplateQuestions"
  | "getDealCimAnalysis"
  | "getDealLinkedCompanies"
  | "getDealLinkedInvestors"
  | "getDealRelationshipCounts";

type ChatToolFlags = {
  strictMode: boolean;
  activeToolGating: boolean;
  debugLogs: boolean;
};

function isFlagEnabled(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getChatToolFlags(): ChatToolFlags {
  const env = getServerEnv();
  return {
    strictMode: isFlagEnabled(env.CHAT_TOOL_STRICT_MODE, false),
    activeToolGating: isFlagEnabled(env.CHAT_TOOL_ACTIVE_GATING, true),
    debugLogs: isFlagEnabled(env.CHAT_TOOL_DEBUG_LOGS),
  };
}

function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > 300 ? `${value.slice(0, 300)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item));
  }
  if (typeof value === "object") {
    const redactedKeys = new Set([
      "content",
      "snippet",
      "text",
      "fileName",
      "title",
      "raw",
      "prompt",
      "query",
      "messages",
    ]);
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        redactedKeys.has(key)
          ? "[redacted]"
          : sanitizeForLog(entryValue),
      ]),
    );
  }
  return value;
}

function getActiveToolsForStep(stepNumber: number): ChatToolName[] {
  if (stepNumber === 0) {
    return [
      "resolveDiligenceScope",
      "retrieveDiligenceEvidence",
      "getEntityCounts",
      "listEntities",
      "getEntityById",
      "getDealOpportunityDossier",
      "getInvestmentThemeDossier",
      "getEntityDocuments",
      "queryBusinessData",
      "listCimScreeningSessions",
      "listScreenedDealOpportunities",
      "listCimScreeningRuns",
      "listScreeners",
      "getScreenerQuestions",
      "listDealScreeningTemplates",
      "getDealScreeningTemplateQuestions",
      "getDealCimAnalysis",
      "getDealLinkedCompanies",
      "getDealLinkedInvestors",
      "getDealRelationshipCounts",
    ];
  }

  if (stepNumber === 1) {
    return [
      "retrieveDiligenceEvidence",
      "compareDiligenceEvidence",
      "runDiligenceChecks",
      "getEntityById",
      "getDealOpportunityDossier",
      "getInvestmentThemeDossier",
      "getEntityDocuments",
      "queryBusinessData",
      "listScreenedDealOpportunities",
      "listCimScreeningRuns",
      "getCimScreeningRunAnswers",
      "getCimScreeningSessionDetail",
      "getDealScreeningTemplateQuestions",
      "getDealCimAnalysis",
      "getDealLinkedCompanies",
      "getDealLinkedInvestors",
      "getDealRelationshipCounts",
    ];
  }

  return [
    "compareDiligenceEvidence",
    "runDiligenceChecks",
    "summarizeDiligenceFindings",
    "getEntityById",
    "getDealOpportunityDossier",
    "getInvestmentThemeDossier",
    "queryBusinessData",
    "getCimScreeningRunAnswers",
    "getCimScreeningSessionDetail",
    "getDealCimAnalysis",
    "getDealLinkedCompanies",
    "getDealLinkedInvestors",
    "getDealRelationshipCounts",
  ];
}

function dedupeMessagesById(messages: UIMessage[]): UIMessage[] {
  const deduped = new Map<string, UIMessage>();
  for (const message of messages) {
    deduped.set(message.id, message);
  }

  return [...deduped.values()];
}

function toolScope(chat: ChatSession) {
  return {
    userId: chat.userId,
    companyId: chat.companyId,
    leadId: chat.leadId,
    dealOpportunityId: chat.dealOpportunityId,
  };
}

function createChatTools(chat: ChatSession, strict: boolean) {
  const scope = toolScope(chat);
  const executeWithWorkerDb = <TInput, TOutput>(
    runner: (input: TInput) => Promise<TOutput>,
  ) => {
    return async (input: TInput) => withWorkerDbIfNeeded(() => runner(input));
  };

  return {
    resolveDiligenceScope: tool({
      description:
        "Resolve the due-diligence scope from chat context and optional deal/company hints.",
      inputSchema: diligenceScopeInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => resolveDiligenceScope(input, scope)),
    }),
    retrieveDiligenceEvidence: tool({
      description:
        "Retrieve due-diligence evidence from document chunks using hybrid retrieval (vector + keyword fallback).",
      inputSchema: retrieveDiligenceEvidenceInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => retrieveDiligenceEvidence(input, scope)),
    }),
    compareDiligenceEvidence: tool({
      description:
        "Compare retrieved evidence and detect cross-document discrepancies.",
      inputSchema: compareDiligenceEvidenceInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => compareDiligenceEvidence(input, scope)),
    }),
    runDiligenceChecks: tool({
      description:
        "Run deterministic diligence checks for discrepancy detection and document coverage gaps.",
      inputSchema: runDiligenceChecksInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => runDiligenceChecks(input, scope)),
    }),
    summarizeDiligenceFindings: tool({
      description:
        "Produce a structured due-diligence report summary from findings/discrepancies.",
      inputSchema: summarizeDiligenceFindingsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => summarizeDiligenceFindings(input)),
    }),
    getEntityCounts: tool({
      description:
        "Get counts of business entities such as leads, companies, themes, screeners, deal opportunities, and documents.",
      inputSchema: entityCountsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getEntityCounts(input, scope)),
    }),
    listEntities: tool({
      description:
        "List business entities with optional search, filters, and pagination.",
      inputSchema: listEntitiesInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => listEntities(input, scope)),
    }),
    getEntityById: tool({
      description:
        "Fetch one entity by id with optional related information.",
      inputSchema: getEntityByIdInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getEntityById(input, scope)),
    }),
    getDealOpportunityDossier: tool({
      description:
        "Fetch a complete deal opportunity dossier including financials, risk flags, screenings, and document metadata.",
      inputSchema: dealOpportunityDossierInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getDealOpportunityDossier(input, scope)),
    }),
    getInvestmentThemeDossier: tool({
      description:
        "Fetch complete investment theme data, including active thesis, industry intelligence, coverage, and related document metadata.",
      inputSchema: themeDossierInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getInvestmentThemeDossier(input)),
    }),
    getEntityDocuments: tool({
      description:
        "Fetch document metadata for an entity. Extracted text is optional and off by default.",
      inputSchema: entityDocumentsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getEntityDocuments(input, scope)),
    }),
    queryBusinessData: tool({
      description:
        "Guarded generic business data reader. Supports count/list/getById/aggregate for business entities.",
      inputSchema: queryBusinessDataInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => queryBusinessData(input, scope)),
    }),
    listCimScreeningSessions: tool({
      description:
        "List CIM template screening sessions for the current user, optionally filtered to a deal opportunity.",
      inputSchema: listCimScreeningSessionsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => listCimScreeningSessions(input, scope)),
    }),
    listScreenedDealOpportunities: tool({
      description:
        "List deal opportunities that have at least one screening session, including run/session counts.",
      inputSchema: listScreenedDealOpportunitiesInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => listScreenedDealOpportunities(input, scope)),
    }),
    listCimScreeningRuns: tool({
      description:
        "List CIM template screening runs for a session, a deal opportunity, or all sessions for the current user.",
      inputSchema: listCimScreeningRunsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => listCimScreeningRuns(input, scope)),
    }),
    getCimScreeningRunAnswers: tool({
      description:
        "Fetch question-by-question answers for a CIM template screening run, with optional evidence excerpts.",
      inputSchema: getCimScreeningRunAnswersInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getCimScreeningRunAnswers(input)),
    }),
    getCimScreeningSessionDetail: tool({
      description:
        "Fetch one CIM template screening session with its runs and optional latest-run Q&A.",
      inputSchema: getCimScreeningSessionDetailInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getCimScreeningSessionDetail(input, scope)),
    }),
    listScreeners: tool({
      description:
        "List screener templates available in the system, with category and question count metadata.",
      inputSchema: listScreenersInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => listScreeners(input)),
    }),
    listDealScreeningTemplates: tool({
      description:
        "List all deal screening templates in the system, with category and question count metadata.",
      inputSchema: listDealScreeningTemplatesInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => listDealScreeningTemplates(input)),
    }),
    getScreenerQuestions: tool({
      description:
        "Fetch all ordered questions for a screener template by screener id.",
      inputSchema: getScreenerQuestionsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getScreenerQuestionsForChat(input)),
    }),
    getDealScreeningTemplateQuestions: tool({
      description:
        "Fetch all ordered questions for a deal screening template by templateId or templateName.",
      inputSchema: getDealScreeningTemplateQuestionsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getDealScreeningTemplateQuestions(input)),
    }),
    getDealCimAnalysis: tool({
      description:
        "Fetch CIM analysis sections for a deal opportunity: growth narrative, financial metrics, risks, and extraction metadata.",
      inputSchema: getDealCimAnalysisInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getDealCimAnalysis(input, scope)),
    }),
    getDealLinkedCompanies: tool({
      description:
        "List companies linked to a deal opportunity via many-to-many relationship mapping.",
      inputSchema: getDealLinkedCompaniesInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getDealLinkedCompanies(input, scope)),
    }),
    getDealLinkedInvestors: tool({
      description:
        "List investors linked to a deal opportunity via many-to-many relationship mapping.",
      inputSchema: getDealLinkedInvestorsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getDealLinkedInvestors(input, scope)),
    }),
    getDealRelationshipCounts: tool({
      description:
        "Get counts of linked companies, linked investors, and screening runs for a deal opportunity.",
      inputSchema: getDealRelationshipCountsInputSchema,
      strict,
      execute: executeWithWorkerDb((input) => getDealRelationshipCounts(input, scope)),
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
    const flags = getChatToolFlags();

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
    log("calling streamText", { provider, model, flags });

    const stream = streamText({
      model: languageModel,
      temperature: 0,
      abortSignal: req.signal,
      system: buildFullChatSystemPrompt(),
      messages: await convertToModelMessages(validatedMessages),
      tools: createChatTools(chat, flags.strictMode),
      stopWhen: stepCountIs(8),
      prepareStep: ({ stepNumber }) => {
        if (!flags.activeToolGating) {
          return {};
        }
        const activeTools = getActiveToolsForStep(stepNumber);
        if (flags.debugLogs) {
          log("tool-gating", { stepNumber, activeTools });
        }
        return { activeTools };
      },
      onStepFinish: ({
        stepNumber,
        finishReason,
        toolCalls,
        toolResults,
        usage,
      }) => {
        log("step-finish", {
          stepNumber,
          finishReason,
          toolCalls: toolCalls.length,
          toolResults: toolResults.length,
          usage,
        });
      },
      experimental_onToolCallStart: (event) => {
        log("tool-call-start", {
          at: Date.now(),
          event: sanitizeForLog(event),
        });
      },
      experimental_onToolCallFinish: (event) => {
        log("tool-call-finish", {
          at: Date.now(),
          event: sanitizeForLog(event),
        });
      },
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
          await runDbWithD1(env.DB, async () =>
            saveChatSessionMessages({
              userId: session.user.id,
              chatId: id,
              messages,
              provider,
              model,
            }),
          );
          log("messages saved on finish", { isAborted });
        } catch (err) {
          console.error("[chat] onFinish saveChatSessionMessages failed:", err);
        }
        if (isAborted) {
          return;
        }
      },
      onError: (error) => {
        if (NoSuchToolError.isInstance(error)) {
          return "The assistant requested an unavailable tool. Please retry.";
        }
        if (InvalidToolInputError.isInstance(error)) {
          return "The assistant produced invalid tool input. Please retry.";
        }
        return "Something went wrong while processing your request.";
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[chat] POST /api/chat error:", message, stack);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
