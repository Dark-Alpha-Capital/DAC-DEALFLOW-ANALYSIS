import { Link } from "@tanstack/react-router";
import { usePathname } from "@/lib/navigation-shim";
import { ClipboardList, Layers, Plus, List, Settings2 } from "lucide-react";
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
  {
    title: "Screeners",
    url: "/screeners",
    icon: Settings2,
    match: (pathname: string) => pathname.startsWith("/screeners"),
  },
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
                  <SidebarMenuButton asChild isActive={item.match(pathname)}>
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
