"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiUserPlus,
  FiTrendingUp,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiHome,
  FiBriefcase,
  FiBookOpen,
  FiDollarSign,
  FiMessageSquare,
  FiChevronRight,
} from "react-icons/fi";
import { FaPalette, FaScrewdriver } from "react-icons/fa";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const dealFlowItems: NavItem[] = [
  { title: "Companies", url: "/companies", icon: FiUsers },
  {
    title: "Deal opportunities",
    url: "/deal-opportunities",
    icon: FiTrendingUp,
  },
];

const investorItems: NavItem[] = [
  { title: "Investors", url: "/investors", icon: FiDollarSign },
  { title: "Investment Themes", url: "/investment-themes", icon: FaPalette },
];

const workspaceItems: NavItem[] = [
  { title: "Docs", url: "/docs", icon: FiBookOpen },
  { title: "Chat", url: "/chat", icon: FiMessageSquare },
];

const adminNavItems: NavItem[] = [
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
  { title: "Analytics", url: "/analytics", icon: FiBarChart2 },
  { title: "Screeners", url: "/screeners", icon: FaScrewdriver },
  { title: "Documents", url: "/documents", icon: FiFileText },
];

const groupLabelClass =
  "text-muted-foreground px-2 text-xs font-semibold tracking-wider uppercase";

function SimpleNavItems({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
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
    </>
  );
}

function LeadsCollapsible() {
  const pathname = usePathname();
  const leadsActive =
    pathname === "/leads" ||
    pathname.startsWith("/leads/") ||
    pathname === "/investor-leads" ||
    pathname.startsWith("/investor-leads/");
  const [open, setOpen] = useState(leadsActive);

  useEffect(() => {
    if (leadsActive) setOpen(true);
  }, [leadsActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Leads" isActive={leadsActive}>
            <FiUserPlus className="size-4" />
            <span>Leads</span>
            <FiChevronRight
              className={cn(
                "ml-auto size-4 shrink-0 transition-transform",
                open && "rotate-90",
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={
                  pathname === "/leads" || pathname.startsWith("/leads/")
                }
              >
                <Link href="/leads">Company leads</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                asChild
                isActive={
                  pathname === "/investor-leads" ||
                  pathname.startsWith("/investor-leads/")
                }
              >
                <Link href="/investor-leads">Investor leads</Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

interface SidebarNavProps {
  session: { user?: { role?: string } } | null;
}

export function SidebarNav({ session }: SidebarNavProps) {
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";

  const dashboardActive = pathname === "/dashboard";

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={dashboardActive}
                tooltip="Dashboard"
              >
                <Link href="/dashboard">
                  <FiHome className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className={groupLabelClass}>Deal flow</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <LeadsCollapsible />
            <SimpleNavItems items={dealFlowItems} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className={groupLabelClass}>Investors</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <SimpleNavItems items={investorItems} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className={groupLabelClass}>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <SimpleNavItems items={workspaceItems} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className={groupLabelClass}>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SimpleNavItems items={adminNavItems} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}
