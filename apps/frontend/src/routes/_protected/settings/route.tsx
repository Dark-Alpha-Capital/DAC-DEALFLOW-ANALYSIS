import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const settingsLinks = [
  { title: "Organization", to: "/settings" },
  { title: "Members", to: "/settings/members" },
  { title: "Investment criteria", to: "/settings/investment-criteria" },
  { title: "Playbook", to: "/settings/playbook" },
] as const;

export const Route = createFileRoute("/_protected/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="container max-w-5xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organization configuration for deal screening and IC scoring.
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 border-b pb-3">
        {settingsLinks.map((link) => {
          const active =
            link.to === "/settings"
              ? pathname === "/settings" || pathname === "/settings/"
              : pathname === link.to || pathname.startsWith(`${link.to}/`);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {link.title}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
