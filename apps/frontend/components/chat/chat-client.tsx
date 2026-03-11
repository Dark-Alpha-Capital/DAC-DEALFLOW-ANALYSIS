"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageSquare } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { ChatPromptInput } from "@/components/chat/chat-prompt-input";
import {
  DEFAULT_CHAT_SELECTION,
  type ChatSelection,
  type ChatProvider,
} from "@/lib/chat-models";
import { useTRPC } from "@/trpc/client";

export function ChatClient({
  chatId,
  initialMessages,
  initialSelection = DEFAULT_CHAT_SELECTION,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  initialSelection?: ChatSelection;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState<ChatSelection>(initialSelection);

  const [provider, model] = selection.split(":") as [ChatProvider, string];

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ id, messages: currentMessages, body }) {
        const message = currentMessages[currentMessages.length - 1];
        return {
          body: {
            ...(body ?? {}),
            id,
            message,
          },
        };
      },
    }),
    onFinish: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.chats.listRecent.queryKey({ limit: 50 }),
      });
      router.refresh();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text) {
      return;
    }

    sendMessage(
      { text },
      {
        body: {
          provider,
          model,
        },
      },
    );

    setInput("");
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                description="Pick a model and send your first message."
                icon={<MessageSquare className="size-10" />}
                title="Start a conversation"
              />
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type !== "text") {
                        return null;
                      }

                      return (
                        <Response key={`${message.id}-${index}`}>
                          {part.text}
                        </Response>
                      );
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <ChatPromptInput
          disabled={!input.trim() || status === "submitted" || status === "streaming"}
          input={input}
          onInputChange={setInput}
          onSelectionChange={setSelection}
          onSubmit={handleSubmit}
          selection={selection}
          status={status}
        />
      </div>
    </div>
  );
}
