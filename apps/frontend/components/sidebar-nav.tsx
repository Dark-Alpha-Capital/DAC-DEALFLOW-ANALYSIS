"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPlus, FiList, FiBriefcase } from "react-icons/fi";
import { FaScrewdriver } from "react-icons/fa";
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

import {
  FiUserPlus,
  FiTrendingUp,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiFolderPlus,
} from "react-icons/fi";
import { FaPalette } from "react-icons/fa";
import { FiHome } from "react-icons/fi";

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: FiHome },
  { title: "Leads", url: "/leads", icon: FiUserPlus },
  { title: "Deals", url: "/deals", icon: FiTrendingUp },
  { title: "Screenings", url: "/screenings", icon: FiBriefcase },
  { title: "Companies", url: "/companies", icon: FiUsers },
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
  { title: "Screeners", url: "/screeners", icon: FaScrewdriver },
  { title: "Themes", url: "/themes", icon: FaPalette },
  { title: "Documents", url: "/documents", icon: FiFileText },
  { title: "Analytics", url: "/analytics", icon: FiBarChart2 },
  { title: "Add", url: "/new", icon: FiFolderPlus },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup className="px-3 py-4">
      <SidebarGroupLabel className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
        Navigation
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
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
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
