import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Session } from "@/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarNav, type SidebarSectionId } from "@/components/sidebar-nav";

const OPEN_SECTIONS_KEY = "app-sidebar-open-sections";
const COLLAPSE_DELAY_MS = 300;

function readOpenSections(): Partial<Record<SidebarSectionId, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(OPEN_SECTIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Partial<Record<SidebarSectionId, boolean>>;
  } catch {
    return {};
  }
}

export function AppSidebar({ session }: { session: Session | null }) {
  const { setOpen, isMobile } = useSidebar();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openSections, setOpenSections] = useState<
    Partial<Record<SidebarSectionId, boolean>>
  >({});

  useEffect(() => {
    setOpenSections(readOpenSections());
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleSectionOpenChange = (id: SidebarSectionId, open: boolean) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: open };
      try {
        sessionStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next));
      } catch {
        // ignore quota / private mode
      }
      return next;
    });
  };

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, COLLAPSE_DELAY_MS);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="z-20"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="DealFlow">
              <Link to="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
                  <span className="text-sm font-bold">DAC</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav
          session={session as { user?: { role?: string } } | null}
          openSections={openSections}
          onSectionOpenChange={handleSectionOpenChange}
        />
      </SidebarContent>
    </Sidebar>
  );
}
