import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DocsSidebar } from "@/components/sidebars/docs-sidebar";
import { Providers } from "@/components/providers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_documentation")({
  component: DocumentationLayout,
});

function DocumentationLayout() {
  return (
    <Providers>
      <SidebarProvider defaultOpen>
        <DocsSidebar />
        <SidebarInset>
          <header className="bg-background/95 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
              >
                <span aria-hidden>←</span>
                <span>Back to app</span>
              </Link>
            </div>
          </header>
          <div className="px-4 pt-6 pb-12 md:px-8">
            <main className="mx-auto w-full max-w-3xl space-y-6">
              <Outlet />
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </Providers>
  );
}
