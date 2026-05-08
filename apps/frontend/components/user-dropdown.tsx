
import { Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
import { User2, LogOut, ChevronUp, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

interface UserDropdownProps {
  session: any;
  userInitials: string;
}

export function UserDropdown({ session, userInitials }: UserDropdownProps) {
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage
              src={session.user?.image || undefined}
              alt={session.user?.name || "User"}
            />
            <AvatarFallback className="rounded-lg text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {session.user?.name || "Account"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {session.user?.email}
            </span>
          </div>
          <ChevronUp className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="top"
        align="end"
        sideOffset={4}
      >
        {session.user?.id && (
          <DropdownMenuItem asChild>
            <Link to="/profile/$uid" params={{ uid: session.user.id }}>
              <User2 />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Lock />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/auth/login");
                },
              },
            });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

