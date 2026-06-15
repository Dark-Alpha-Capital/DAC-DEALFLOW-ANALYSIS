import { Link } from "@tanstack/react-router";
import { User2 } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserDropdown } from "@/components/user-dropdown";

interface SidebarUserProps {
  session: any;
}

export function SidebarUser({ session }: SidebarUserProps) {
  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {session ? (
          <UserDropdown session={session} userInitials={userInitials} />
        ) : (
          <SidebarMenuButton asChild size="lg">
            <Link to="/auth/login">
              <User2 />
              <span>Sign In</span>
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
