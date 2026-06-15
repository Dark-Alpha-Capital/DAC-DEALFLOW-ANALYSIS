import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

export const Route = createFileRoute("/_authentication")({
  component: AuthenticationLayout,
});

function AuthenticationLayout() {
  return (
    <ThemeProvider disableTransitionOnChange>
      <TRPCReactProvider>
        <main className="min-h-screen">
          <div className="flex min-h-screen items-center justify-center p-4">
            <Outlet />
          </div>
        </main>
        <Toaster />
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
