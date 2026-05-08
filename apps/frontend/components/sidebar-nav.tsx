import { Link } from "@tanstack/react-router";
import { usePathname } from "@/lib/navigation-shim";
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
];

const adminNavItems: NavItem[] = [
  { title: "Admin", url: "/admin", icon: FiShield },
  { title: "Jobs", url: "/jobs", icon: FiBriefcase },
  { title: "Analytics", url: "/analytics", icon: FiBarChart2 },
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
                <Link to="/dashboard">
                  <FiHome className="size-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className={groupLabelClass}>
          Dealflow
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <SimpleNavItems items={dealFlowItems} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel className={groupLabelClass}>
          Workspace
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            <SimpleNavItems items={workspaceItems} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className={groupLabelClass}>
            Admin
          </SidebarGroupLabel>
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
