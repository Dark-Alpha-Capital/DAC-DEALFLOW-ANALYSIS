import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
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
  FiClipboard,
  FiShield,
  FiLayers,
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
} from "@/components/ui/sidebar";
import { usePathname } from "@/lib/navigation-shim";

export type SidebarSectionId = "dealflow" | "workspace" | "admin";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const dealFlowItems: NavItem[] = [
  { title: "Screening", url: "/screening/", icon: FiClipboard },
  { title: "Screeners", url: "/screeners", icon: FaScrewdriver },
  {
    title: "Deal opportunities",
    url: "/deal-opportunities",
    icon: FiTrendingUp,
  },
  { title: "Deal leads", url: "/leads", icon: FiUserPlus },
  { title: "Investor leads", url: "/investor-leads", icon: FiUserPlus },
  { title: "Companies", url: "/companies", icon: FiUsers },
  { title: "Investors", url: "/investors", icon: FiDollarSign },
  { title: "Investment Themes", url: "/investment-themes", icon: FaPalette },
];

const workspaceItems: NavItem[] = [
  { title: "Docs", url: "/docs", icon: FiBookOpen },
  { title: "Documents", url: "/documents", icon: FiFileText },
  { title: "Chat", url: "/chat", icon: FiMessageSquare },
  { title: "Project Trackers", url: "/project-trackers", icon: FiLayers },
];

const adminNavItems: NavItem[] = [
  { title: "Admin", url: "/admin", icon: FiShield },
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
  { title: "Analytics", url: "/analytics", icon: FiBarChart2 },
];

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
              <Link to={item.url as any}>
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

function NavGroup({
  id,
  label,
  items,
  open,
  onOpenChange,
}: {
  id: SidebarSectionId;
  label: string;
  items: NavItem[];
  open: boolean;
  onOpenChange: (id: SidebarSectionId, open: boolean) => void;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => onOpenChange(id, next)}
      className="group/collapsible"
    >
      <SidebarGroup>
        <SidebarGroupLabel
          asChild
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground px-2 text-xs font-semibold tracking-wider uppercase"
        >
          <CollapsibleTrigger className="flex w-full items-center gap-2">
            <span className="truncate">{label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SimpleNavItems items={items} />
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

interface SidebarNavProps {
  session: { user?: { role?: string } } | null;
  openSections: Partial<Record<SidebarSectionId, boolean>>;
  onSectionOpenChange: (id: SidebarSectionId, open: boolean) => void;
}

export function SidebarNav({
  session,
  openSections,
  onSectionOpenChange,
}: SidebarNavProps) {
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
                <Link to="/dashboard">
                  <FiHome className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <NavGroup
        id="dealflow"
        label="Dealflow"
        items={dealFlowItems}
        open={openSections.dealflow ?? false}
        onOpenChange={onSectionOpenChange}
      />

      <NavGroup
        id="workspace"
        label="Workspace"
        items={workspaceItems}
        open={openSections.workspace ?? false}
        onOpenChange={onSectionOpenChange}
      />

      {isAdmin ? (
        <NavGroup
          id="admin"
          label="Admin"
          items={adminNavItems}
          open={openSections.admin ?? false}
          onOpenChange={onSectionOpenChange}
        />
      ) : null}
    </>
  );
}
