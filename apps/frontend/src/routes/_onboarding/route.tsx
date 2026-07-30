import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { requireAuthenticatedUser } from "@/lib/auth/require-auth";

export const Route = createFileRoute("/_onboarding")({
  beforeLoad: async () => {
    const session = await requireAuthenticatedUser();
    return { session };
  },
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <Providers>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </Providers>
  );
}
