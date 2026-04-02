
import { MessageSquare } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { NewChatButton } from "@/components/chat/new-chat-button";

export function ChatWelcome() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Conversation className="min-h-0">
          <ConversationContent>
            <ConversationEmptyState className="gap-4">
              <div className="text-muted-foreground">
                <MessageSquare className="size-10" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-sm">Start a conversation</h3>
                <p className="text-muted-foreground text-sm">
                  Start a new conversation to get started.
                </p>
              </div>
              <NewChatButton size="lg" />
            </ConversationEmptyState>
          </ConversationContent>
        </Conversation>
      </div>
    </div>
  );
}
