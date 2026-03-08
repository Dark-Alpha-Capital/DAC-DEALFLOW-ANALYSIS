"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type TopLevelLink = {
  title: string;
  href: string;
  matchStartsWith?: boolean;
};

const topLevelLinks: TopLevelLink[] = [
  { title: "Overview", href: "/docs" },
  { title: "Getting started", href: "/docs/getting-started" },
  { title: "Companies", href: "/docs/companies", matchStartsWith: true },
  { title: "Leads", href: "/docs/leads", matchStartsWith: true },
  { title: "Deals pipeline", href: "/docs/deals" },
  { title: "Themes", href: "/docs/themes" },
  { title: "Documents", href: "/docs/documents" },
  { title: "Screenings", href: "/docs/screenings" },
  { title: "Analytics", href: "/docs/analytics" },
  { title: "Jobs", href: "/docs/jobs" },
  { title: "Admin access", href: "/docs/admin" },
  { title: "FAQ", href: "/docs/faq" },
];

const companyWorkflowLinks = [
  { title: "Company coverage", href: "/docs/companies#company-coverage" },
  { title: "Add contact", href: "/docs/companies#workflow-add-contact" },
  { title: "Add outreach", href: "/docs/companies#workflow-add-outreach" },
  { title: "Add notes", href: "/docs/companies#workflow-add-notes" },
  { title: "Assign theme", href: "/docs/companies#workflow-assign-theme" },
];

const leadWorkflowLinks = [
  { title: "Lead vs Company", href: "/docs/leads#lead-entity-model" },
  { title: "Supported actions", href: "/docs/leads#lead-resolution-actions" },
  { title: "Convert to company", href: "/docs/leads#action-convert-to-company" },
  { title: "Mark duplicate", href: "/docs/leads#action-mark-duplicate" },
  { title: "Reject lead", href: "/docs/leads#action-reject-lead" },
  { title: "Clear duplicate", href: "/docs/leads#action-clear-duplicate" },
];

function getIsActive(pathname: string, item: TopLevelLink) {
  if (item.matchStartsWith) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return pathname === item.href;
}

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/docs" className="text-sm font-semibold tracking-tight">
          Documentation
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
            Guide
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {topLevelLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={getIsActive(pathname, item)}>
                    <Link href={item.href}>{item.title}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-3 pb-2">
          <SidebarGroupLabel className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
            Company workflows
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenuSub>
              {companyWorkflowLinks.map((item) => (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === "/docs/companies"}
                  >
                    <Link href={item.href}>{item.title}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-3 pb-4">
          <SidebarGroupLabel className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
            Lead workflow
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenuSub>
              {leadWorkflowLinks.map((item) => (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton asChild isActive={pathname === "/docs/leads"}>
                    <Link href={item.href}>{item.title}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
