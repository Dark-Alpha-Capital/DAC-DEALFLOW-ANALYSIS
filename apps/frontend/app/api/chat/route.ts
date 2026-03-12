import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
  tool,
  type UIMessage,
  validateUIMessages,
} from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
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

const WEATHER_CONDITIONS = [
  "Sunny",
  "Cloudy",
  "Rainy",
  "Windy",
  "Foggy",
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

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
    system:
      "You are a helpful assistant with testing tools. Use getWeatherInformation for weather requests, getLocation for user location requests, and getStockQuote for stock price requests.",
    messages: await convertToModelMessages(validatedMessages),
    tools: {
      getWeatherInformation: tool({
        description: "Get deterministic weather details for a city.",
        inputSchema: z.object({
          city: z.string().describe("City to get weather for"),
        }),
        execute: async ({ city }) => {
          const normalizedCity = city.trim() || "Unknown";
          const hash = hashString(normalizedCity.toLowerCase());

          return {
            city: normalizedCity,
            condition: WEATHER_CONDITIONS[hash % WEATHER_CONDITIONS.length],
            temperatureC: 10 + (hash % 23),
            humidityPct: 35 + (hash % 60),
          };
        },
      }),
      getLocation: tool({
        description:
          "Get a deterministic test location for the current user session.",
        inputSchema: z.object({}),
      }),
      getStockQuote: tool({
        description:
          "Get a deterministic stock quote for a symbol. Ask approval before running.",
        inputSchema: z.object({
          symbol: z.string().describe("Stock ticker symbol, e.g. AAPL"),
        }),
        needsApproval: true,
        execute: async ({ symbol }) => {
          const normalizedSymbol = symbol.trim().toUpperCase() || "AAPL";
          const hash = hashString(normalizedSymbol);
          const basis = 40 + (hash % 460);
          const cents = (hash % 100) / 100;
          const change = ((hash % 200) - 100) / 10;

          return {
            symbol: normalizedSymbol,
            price: Number((basis + cents).toFixed(2)),
            changePct: Number(change.toFixed(2)),
            asOf: "2026-01-01T12:00:00.000Z",
            venue: "NASDAQ",
            delayed: true,
          };
        },
      }),
    },
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      await saveChatSessionMessages({
        userId: session.user.id,
        chatId: id,
        messages,
        provider,
        model,
      });
    },
  });
}
