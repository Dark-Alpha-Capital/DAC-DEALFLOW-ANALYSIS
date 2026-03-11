"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, LayoutDashboard, BookOpen } from "lucide-react";
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
import { ChatSidebarItem } from "./chat-sidebar-item";
import { SidebarUser } from "@/components/sidebar-user";
import { useTRPC } from "@/trpc/client";
import { useSession } from "@/lib/auth-client";

const layoutLinks = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chat", url: "/chat", icon: MessageSquarePlus },
  { title: "Docs", url: "/docs", icon: BookOpen },
];

export default function ChatSidebar() {
  const pathname = usePathname();
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { data: chats = [], isLoading } = useQuery(
    trpc.chats.listRecent.queryOptions({ limit: 50 }),
  );

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="border-b px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/chat"}>
              <Link href="/chat">
                <MessageSquarePlus className="size-4" />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Layouts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {layoutLinks.map((item) => {
                const isActive =
                  pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
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

        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>Loading chats...</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : chats.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>No chats yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                chats.map((chat) => (
                  <ChatSidebarItem key={chat.id} chat={chat} />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser session={session ?? null} />
      </SidebarFooter>
    </Sidebar>
  );
}
