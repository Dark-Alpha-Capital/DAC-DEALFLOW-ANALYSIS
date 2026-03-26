import { Suspense } from "react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth-server";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarUser } from "@/components/sidebar-user";
import { AppSidebarSkeleton } from "@/components/skeletons/app-sidebar-skeleton";

async function AppSidebarContent() {
  const session = await getSession();

  return (
    <>
      <SidebarContent>
        <SidebarNav session={session as { user?: { role?: string } } | null} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser session={session} />
      </SidebarFooter>
    </>
  );
}

export async function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                  <span className="text-sm font-bold">DAC</span>
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">DealFlow</span>
                  <span className="text-muted-foreground truncate text-xs">
                    M&A Platform
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AppSidebarContent />
      </Suspense>
    </Sidebar>
  );
}
