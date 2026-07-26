import { Link } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { ChevronDown, LogOut, Moon, Sun, User2 } from "lucide-react";
import type { Session } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/lib/navigation-shim";

function getUserInitials(session: Session) {
  return (
    session.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

export function UserNav({ session }: { session: Session }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const userInitials = getUserInitials(session);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-2 data-[state=open]:bg-accent"
        >
          <Avatar className="size-7 rounded-lg">
            <AvatarImage
              src={session.user?.image || undefined}
              alt={session.user?.name || "User"}
            />
            <AvatarFallback className="rounded-lg text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground hidden max-w-[180px] truncate text-sm sm:inline">
            {session.user?.email}
          </span>
          <ChevronDown className="text-muted-foreground size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        {session.user?.id ? (
          <DropdownMenuItem asChild>
            <Link to="/profile/$uid" params={{ uid: session.user.id }}>
              <User2 />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
          <span>Toggle Theme</span>
        </DropdownMenuItem>
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
