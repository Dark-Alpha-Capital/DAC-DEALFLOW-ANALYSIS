import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

export const Route = createFileRoute("/_authentication")({
  component: AuthenticationLayout,
});

function AuthenticationLayout() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCReactProvider>
        <main className="min-h-screen">
          <div className="absolute top-4 right-4">
            <ModeToggle />
          </div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <Outlet />
          </div>
        </main>
        <Toaster />
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
