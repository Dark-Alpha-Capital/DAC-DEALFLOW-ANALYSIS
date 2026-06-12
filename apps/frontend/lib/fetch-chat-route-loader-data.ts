import type { UIMessage } from "ai";
import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import type { ChatContext } from "@/lib/chat-context";
import { coerceStoredMessages } from "@/lib/chat-messages";
import { getSelectionFromProviderAndModel } from "@/lib/chat-models";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { chatLoaderInputSchema } from "@/lib/server/server-fn-input-schemas";

export type ChatRouteLoaderData = {
  chatId: string;
  initialContext: ChatContext;
  initialMessages: UIMessage[];
  initialSelection: ReturnType<typeof getSelectionFromProviderAndModel>;
};

export const fetchChatRouteLoaderData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => chatLoaderInputSchema.parse(raw))
  // @ts-expect-error Start ServerFn R is stricter than loader data (UIMessage, redirect throw)
  .handler(async ({ data }) => {
    const session = await assertAuthenticated();
    const userId = session.user.id;
    const { getChatSessionForUser } = await import("@/lib/chat-store");
    const chat = await getChatSessionForUser(userId, data.chatId);
    if (!chat) {
      throw redirect({ to: "/chat" });
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
