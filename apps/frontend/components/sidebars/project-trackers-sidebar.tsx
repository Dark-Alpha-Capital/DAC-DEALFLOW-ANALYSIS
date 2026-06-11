import { Link } from "@tanstack/react-router";
import { usePathname } from "@/lib/navigation-shim";
import {
  BookOpen,
  LayoutDashboard,
  Layers,
  MessageSquarePlus,
  Plus,
  List,
} from "lucide-react";
import type { Session } from "@/auth";
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
import { SidebarUser } from "@/components/sidebar-user";
import { PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";

const projectNavItems = [
  {
    title: "All projects",
    url: "/project-trackers",
    search: PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH,
    icon: List,
    match: (pathname: string) =>
      pathname === "/project-trackers" || pathname === "/project-trackers/",
  },
  {
    title: "New kickoff",
    url: "/project-kickoff",
    icon: Plus,
    match: (pathname: string) =>
      pathname === "/project-kickoff" || pathname === "/project-kickoff/",
  },
] as const;

const layoutLinks = [
  { title: "DealFlow", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageSquarePlus },
  { title: "Docs", url: "/docs", icon: BookOpen },
] as const;

export function ProjectTrackersSidebar({ session }: { session: Session }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="border-b px-4 py-3">
        <Link
          to="/project-trackers"
          search={PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Layers className="size-4" />
          <span>Project Trackers</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.match(pathname)}
                  >
                    <Link
                      to={item.url}
                      {...("search" in item ? { search: item.search } : {})}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Layouts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {layoutLinks.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url}>
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
