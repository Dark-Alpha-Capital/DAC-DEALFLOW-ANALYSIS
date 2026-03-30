import type { UIMessage } from "ai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ChatContext } from "@/lib/chat-context";
import { coerceStoredMessages } from "@/lib/chat-messages";
import { getSelectionFromProviderAndModel } from "@/lib/chat-models";

const inputSchema = z.object({
  userId: z.string(),
  chatId: z.string(),
});

export type ChatRouteLoaderData = {
  chatId: string;
  initialContext: ChatContext;
  initialMessages: UIMessage[];
  initialSelection: ReturnType<typeof getSelectionFromProviderAndModel>;
};

export const fetchChatRouteLoaderData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data }): Promise<ChatRouteLoaderData | null> => {
    const { getChatSessionForUser } = await import("@/lib/chat-store");
    const chat = await getChatSessionForUser(data.userId, data.chatId);
    if (!chat) {
      return null;
    }

    const initialMessages = coerceStoredMessages(chat.messages);
    const initialSelection = getSelectionFromProviderAndModel(
      chat.provider,
      chat.model,
    );
    const initialContext: ChatContext = {
      companyId: chat.companyId ?? null,
      leadId: chat.leadId ?? null,
      dealOpportunityId: chat.dealOpportunityId ?? null,
    };

    return {
      chatId: chat.id,
      initialContext,
      initialMessages,
      initialSelection,
    };
  });
