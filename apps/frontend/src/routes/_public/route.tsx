import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

/** Pathless layout: no auth; wraps public tools that still need theme + TRPC. */
export const Route = createFileRoute("/_public")({
  component: PublicToolLayout,
});

function PublicToolLayout() {
  return (
    <Providers>
      <div className="bg-background min-h-screen">
        <div className="pointer-events-none fixed top-4 right-4 z-50">
          <div className="pointer-events-auto">
            <ModeToggle />
          </div>
        </div>
        <Outlet />
      </div>
      <Toaster />
    </Providers>
  );
}
