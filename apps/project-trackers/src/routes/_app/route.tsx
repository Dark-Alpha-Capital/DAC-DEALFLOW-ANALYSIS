import { Suspense, useState, useRef, useEffect, type CSSProperties } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProjectTrackersSidebar } from "@/components/sidebars/project-trackers-sidebar";
import { Providers } from "@/components/providers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAuthenticatedUser } from "@/lib/require-auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const session = await requireAuthenticatedUser();
    return { session };
  },
  component: AppLayout,
});

function AppLayout() {
  const { session } = Route.useRouteContext();
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const draggingRef = useRef(false);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      setSidebarWidth(Math.min(420, Math.max(200, e.clientX)));
    }
    function onUp() {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <Providers>
      <SidebarProvider
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <Suspense fallback={null}>
          <ProjectTrackersSidebar session={session} />
        </Suspense>
        <div
          onPointerDown={(e) => {
            draggingRef.current = true;
            document.body.style.userSelect = "none";
            e.preventDefault();
          }}
          className="fixed top-0 z-20 hidden h-full w-1 cursor-col-resize hover:bg-primary/40 md:block"
          style={{ left: sidebarWidth }}
        />
        <SidebarInset className="min-h-0 min-w-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <span className="text-muted-foreground text-sm">
                Dark Alpha Capital — Project Trackers
              </span>
              <div className="flex-1" />
              <ThemeToggle />
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
