"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  FiPlus,
  FiList,
  FiCheckSquare,
  FiHome,
  FiClock,
} from "react-icons/fi";
import { FaScrewdriver } from "react-icons/fa";
import { Lock, User2, LogOut, ChevronUp } from "lucide-react";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

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
  { title: "History", url: "/job-history", icon: FiClock },
];

export function AppSidebar() {
  const pathname = usePathname();
  const session = useSession();
  const isLoading = session.status === "loading";
  const isAdmin = session.data?.user?.role === "ADMIN";

  // Add admin link if user is admin
  const menuItems = isAdmin
    ? [...navItems, { title: "Admin", url: "/admin", icon: Lock }]
    : navItems;

  const userInitials =
    session.data?.user?.name
      ?.split(" ")
      .map((n) => n[0])
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
                  <span className="truncate font-semibold">
                    DAC Dealflow
                  </span>
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
              {menuItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isLoading ? (
              <SidebarMenuButton size="lg" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </SidebarMenuButton>
            ) : session.data ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={session.data.user?.image || undefined}
                        alt={session.data.user?.name || "User"}
                      />
                      <AvatarFallback className="rounded-lg text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session.data.user?.name || "Account"}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {session.data.user?.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  {session.data.user?.id && (
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${session.data.user.id}`}>
                        <User2 />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton asChild size="lg">
                <Link href="/auth/login">
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

