import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import { Topbar } from "@/components/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
      <SidebarProvider
        defaultOpen={false}
        className="**:data-[slot=sidebar-gap]:w-(--sidebar-width-icon)!"
      >
        <AppSidebar session={session} />
        <SidebarInset className="min-h-0 min-w-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Topbar session={session} />
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
