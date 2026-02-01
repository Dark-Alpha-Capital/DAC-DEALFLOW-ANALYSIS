"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPlus, FiList, FiHome, FiBriefcase } from "react-icons/fi";
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

const navItems: NavItem[] = [
  { title: "New Deal", url: "/new-deal", icon: FiPlus },
  { title: "Raw Deals", url: "/raw-deals", icon: FiList },
  { title: "Screeners", url: "/screeners", icon: FaScrewdriver },
  { title: "Companies", url: "/companies", icon: FiHome },
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
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
