import { createFileRoute, Outlet } from "@tanstack/react-router";
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
        <Outlet />
      </div>
      <Toaster />
    </Providers>
  );
}
