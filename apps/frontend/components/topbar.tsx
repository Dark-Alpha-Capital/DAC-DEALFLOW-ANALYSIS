import type { Session } from "@/auth";
import { UserNav } from "@/components/user-nav";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Topbar({ session }: { session: Session }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="md:hidden" />
      <span className="text-muted-foreground text-sm font-medium">DealFlow</span>
      <div className="ml-auto">
        <UserNav session={session} />
      </div>
    </header>
  );
}
