import { type UIMessage } from "ai";
import { and, chatSessions, db, desc, eq } from "@repo/db";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_CHAT_PROVIDER,
  type ChatProvider,
} from "@/lib/chat-models";

const DEFAULT_CHAT_TITLE = "New chat";

type PersistedMessages = Record<string, unknown>[];
export type ChatSessionContext = {
  companyId?: string | null;
  leadId?: string | null;
  dealOpportunityId?: string | null;
};

function deriveTitleFromMessages(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) {
    return DEFAULT_CHAT_TITLE;
  }

  const firstTextPart = firstUserMessage.parts.find((part) => part.type === "text");
  if (!firstTextPart || !firstTextPart.text.trim()) {
    return DEFAULT_CHAT_TITLE;
  }

  return firstTextPart.text.trim().slice(0, 80);
}

export async function createChatSessionForUser(userId: string): Promise<string> {
  const [created] = await db
    .insert(chatSessions)
    .values({
      userId,
      title: DEFAULT_CHAT_TITLE,
      provider: DEFAULT_CHAT_PROVIDER,
      model: DEFAULT_CHAT_MODEL,
      companyId: null,
      leadId: null,
      dealOpportunityId: null,
      messages: [],
    })
    .returning({ id: chatSessions.id });

  if (!created?.id) {
    throw new Error("Failed to create chat session.");
  }

  return created.id;
}

export async function getChatSessionForUser(userId: string, chatId: string) {
  const [chat] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .limit(1);

  return chat ?? null;
}

export async function listRecentChatSessionsForUser(
  userId: string,
  limit = 50,
) {
  return db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      provider: chatSessions.provider,
      model: chatSessions.model,
      updatedAt: chatSessions.updatedAt,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(limit);
}

export async function updateChatSessionTitle({
  userId,
  chatId,
  title,
}: {
  userId: string;
  chatId: string;
  title: string;
}) {
  const updated = await db
    .update(chatSessions)
    .set({
      title: title.trim().slice(0, 200) || DEFAULT_CHAT_TITLE,
      updatedAt: new Date(),
    })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id });

  return updated.length > 0;
}

export async function deleteChatSessionForUser(
  userId: string,
  chatId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id });

  return deleted.length > 0;
}

export async function saveChatSessionMessages({
  userId,
  chatId,
  messages,
  provider,
  model,
}: {
  userId: string;
  chatId: string;
  messages: UIMessage[];
  provider: ChatProvider;
  model: string;
}) {
  const updated = await db
    .update(chatSessions)
    .set({
      title: deriveTitleFromMessages(messages),
      provider,
      model,
      messages: messages as unknown as PersistedMessages,
      updatedAt: new Date(),
    })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id });

  return updated.length > 0;
}

export async function updateChatSessionContext({
  userId,
  chatId,
  context,
}: {
  userId: string;
  chatId: string;
  context: ChatSessionContext;
}) {
  const updated = await db
    .update(chatSessions)
    .set({
      companyId: context.companyId ?? null,
      leadId: context.leadId ?? null,
      dealOpportunityId: context.dealOpportunityId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(chatSessions.id, chatId), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id });

  return updated.length > 0;
}
