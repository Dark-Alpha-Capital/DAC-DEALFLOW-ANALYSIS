import {
  convertToModelMessages,
  createIdGenerator,
  streamText,
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

export const maxDuration = 30;

type ChatRequestBody = {
  id: string;
  message: UIMessage;
  provider?: ChatProvider;
  model: string;
};

const badRequest = (message: string) =>
  Response.json({ error: message }, { status: 400 });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ChatRequestBody;
  const provider = body.provider ?? DEFAULT_CHAT_PROVIDER;
  const { id, message, model } = body;

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

  if (!isAllowedModel(provider, model)) {
    return badRequest("Unsupported model for provider.");
  }

  const chat = await getChatSessionForUser(session.user.id, id);
  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const previousMessages = coerceStoredMessages(chat.messages);
  const validatedMessages = await validateUIMessages({
    messages: [...previousMessages, message],
  });

  const resolvedModel =
    provider === "openai" ? openai(model) : google(model);

  const result = streamText({
    model: resolvedModel,
    messages: await convertToModelMessages(validatedMessages),
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
