import { Suspense } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import ChatSidebar from "@/components/sidebars/chat-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/_chatbot")({
  beforeLoad: async () => {
    const session = await requireAuthenticatedUser();
    return { authUserId: session.user.id };
  },
  component: ChatbotLayout,
});

function ChatbotLayout() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCReactProvider>
        <SidebarProvider className="h-svh overflow-hidden">
          <Suspense fallback={null}>
            <ChatSidebar />
          </Suspense>
          <SidebarInset className="min-h-0 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
                <Outlet />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <div className="pointer-events-none fixed top-4 right-4 z-50">
          <div className="pointer-events-auto">
            <ModeToggle />
          </div>
        </div>
        <Toaster />
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
