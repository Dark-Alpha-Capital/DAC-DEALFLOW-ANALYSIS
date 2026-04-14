import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/_protected")({
  beforeLoad: async () => {
    const session = await requireAuthenticatedUser();
    return { session };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { session } = Route.useRouteContext();
  return (
    <Providers>
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset className="min-h-0 min-w-0">
          {/* SidebarInset is already <main>; nested <main> was invalid and breaks layout/a11y.
              min-h-0 + overflow chain prevents flex children from painting over the rest of the page. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </Providers>
  );
}
