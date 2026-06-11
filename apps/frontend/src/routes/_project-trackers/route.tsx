import { Suspense } from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ProjectTrackersSidebar } from "@/components/sidebars/project-trackers-sidebar";
import { Providers } from "@/components/providers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/_project-trackers")({
  beforeLoad: async () => {
    const session = await requireAuthenticatedUser();
    return { session };
  },
  component: ProjectTrackersLayout,
});

function ProjectTrackersLayout() {
  const { session } = Route.useRouteContext();

  return (
    <Providers>
      <SidebarProvider>
        <Suspense fallback={null}>
          <ProjectTrackersSidebar session={session} />
        </Suspense>
        <SidebarInset className="min-h-0 min-w-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                <span aria-hidden>←</span> Back to DealFlow
              </Link>
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
