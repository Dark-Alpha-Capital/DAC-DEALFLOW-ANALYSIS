import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
      <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Chat</h2>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        The chat feature has been removed.
      </p>
    </div>
  );
}
