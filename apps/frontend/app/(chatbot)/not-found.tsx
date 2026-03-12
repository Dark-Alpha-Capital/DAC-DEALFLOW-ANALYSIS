import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, FileQuestion } from "lucide-react";

export default function ChatbotNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <FileQuestion className="text-muted-foreground h-16 w-16" />
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground max-w-sm">
          This chat or page doesn&apos;t exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/chat" className="gap-2">
          <Home className="h-4 w-4" />
          New chat
        </Link>
      </Button>
    </div>
  );
}
