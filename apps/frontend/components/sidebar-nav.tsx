"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiUserPlus,
  FiTrendingUp,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiFolderPlus,
  FiHome,
  FiBriefcase,
} from "react-icons/fi";
import { FaPalette, FaScrewdriver } from "react-icons/fa";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: FiHome },
  { title: "Leads", url: "/leads", icon: FiUserPlus },
  { title: "Deals", url: "/deals", icon: FiTrendingUp },
  { title: "Companies", url: "/companies", icon: FiUsers },
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
  { title: "Themes", url: "/themes", icon: FaPalette },
  { title: "Add", url: "/new", icon: FiFolderPlus },
];

const adminNavItems: NavItem[] = [
  { title: "Analytics", url: "/analytics", icon: FiBarChart2 },
  { title: "Screeners", url: "/screeners", icon: FaScrewdriver },
  { title: "Documents", url: "/documents", icon: FiFileText },
];

function NavItemList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.url || pathname.startsWith(item.url + "/");
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
              <Link href={item.url}>
                <item.icon className="size-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

interface SidebarNavProps {
  session: { user?: { role?: string } } | null;
}

export function SidebarNav({ session }: SidebarNavProps) {
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <>
      <SidebarGroup className="px-3 py-4">
        <SidebarGroupLabel className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
          Navigation
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <NavItemList items={navItems} />
        </SidebarGroupContent>
      </SidebarGroup>
      {isAdmin && (
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItemList items={adminNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}
