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
    <Sidebar collapsible="icon" variant="inset">
      {/* <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <span className="text-sm font-bold">DAC</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader> */}
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AppSidebarContent />
      </Suspense>
    </Sidebar>
  );
}
