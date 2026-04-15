import { Suspense } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import ChatSidebar from "@/components/sidebars/chat-sidebar";
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
    <ThemeProvider disableTransitionOnChange>
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
        <Toaster />
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
