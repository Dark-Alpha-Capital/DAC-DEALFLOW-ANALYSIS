import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "@/lib/navigation-shim";
import { useTRPC } from "@/trpc/client";
import {
  ChevronLeft,
  Layers,
  Plus,
  List,
  Settings2,
  Flag,
  BarChart3,
  ListTodo,
  BookOpen,
  RotateCw,
  Package2,
  Sparkles,
  Info,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarUser } from "@/components/sidebar-user";
import { PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";

const workspaceNavItems = [
  {
    title: "All projects",
    url: "/project-trackers" as const,
    search: PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH,
    icon: List,
    match: (pathname: string) =>
      pathname === "/project-trackers" || pathname === "/project-trackers/",
  },
  {
    title: "New kickoff",
    url: "/project-kickoff" as const,
    icon: Plus,
    match: (pathname: string) =>
      pathname === "/project-kickoff" || pathname === "/project-kickoff/",
  },
] as const;

const workspaceUtilItems = [
  {
    title: "Screeners",
    url: "/screeners" as const,
    icon: Settings2,
    match: (pathname: string) => pathname.startsWith("/screeners"),
  },
  {
    title: "Initiatives",
    url: "/initiatives" as const,
    icon: Flag,
    match: (pathname: string) => pathname.startsWith("/initiatives"),
  },
  {
    title: "Analytics",
    url: "/analytics" as const,
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith("/analytics"),
  },
] as const;

const projectTabItems = [
  { title: "Work Items", tab: "work-items", icon: ListTodo },
  { title: "Epics", tab: "epics", icon: BookOpen },
  { title: "Cycles", tab: "cycles", icon: RotateCw },
  { title: "Modules", tab: "modules", icon: Package2 },
  { title: "AI Scoring", tab: "ai-scoring", icon: Sparkles },
  { title: "Project Info", tab: "project-info", icon: Info },
] as const;

function ProjectSubNav({
  trackerId,
  currentTab,
}: {
  trackerId: string;
  currentTab: string;
}) {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.projectTrackers.getById.queryOptions({ trackerId }),
  });

  const displayName =
    data?.kickoff?.projectName ?? data?.tracker?.name ?? "Project";

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link
                  to="/project-trackers"
                  search={PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH}
                  className="gap-2"
                >
                  <ChevronLeft className="size-4" />
                  <span>All Projects</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {displayName}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {projectTabItems.map((item) => (
              <SidebarMenuItem key={item.tab}>
                <SidebarMenuButton
                  asChild
                  isActive={currentTab === item.tab}
                >
                  <Link
                    to="/project-trackers/$trackerId"
                    params={{ trackerId }}
                    search={{ tab: item.tab }}
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

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {workspaceUtilItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild>
                  <Link to={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

function WorkspaceNav({ pathname }: { pathname: string }) {
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {workspaceNavItems.map((item) => (
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

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {workspaceUtilItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={item.match(pathname)}>
                  <Link to={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

export function ProjectTrackersSidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const routerState = useRouterState();

  const trackerMatch = pathname.match(/^\/project-trackers\/([^/?]+)/);
  const currentTrackerId = trackerMatch?.[1] ?? null;

  const searchStr = routerState.location.search;
  const searchParams = new URLSearchParams(
    searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
  );
  const currentTab = searchParams.get("tab") ?? "work-items";

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
        {currentTrackerId ? (
          <ProjectSubNav
            trackerId={currentTrackerId}
            currentTab={currentTab}
          />
        ) : (
          <WorkspaceNav pathname={pathname} />
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser session={session} />
      </SidebarFooter>
    </Sidebar>
  );
}
