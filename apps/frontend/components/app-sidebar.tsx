"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPlus, FiList, FiCheckSquare, FiHome, FiBriefcase } from "react-icons/fi";
import { FaScrewdriver } from "react-icons/fa";
import { User2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserDropdown } from "@/components/user-dropdown";
import { JobTrackerSidebar } from "@/components/job-tracker-sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { title: "New", url: "/new-deal", icon: FiPlus },
  { title: "Raw", url: "/raw-deals", icon: FiList },
  { title: "Published", url: "/published-deals", icon: FiCheckSquare },
  { title: "Screener", url: "/screeners", icon: FaScrewdriver },
  { title: "Companies", url: "/companies", icon: FiHome },
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const isLoading = isPending;

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <span className="text-sm font-bold">DAC</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">DAC Dealflow</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Deal Origination
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <JobTrackerSidebar />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isLoading ? (
              <SidebarMenuButton size="lg" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </SidebarMenuButton>
            ) : session ? (
              <UserDropdown session={session} userInitials={userInitials} />
            ) : (
              <SidebarMenuButton asChild size="lg">
                <Link href={"/auth/login"}>
                  <User2 />
                  <span>Sign In</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
