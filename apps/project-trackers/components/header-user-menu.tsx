import { useTheme } from "next-themes";
import { useRouter } from "@/lib/navigation-shim";
import { Moon, Sun, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import type { Session } from "@/auth";

export function HeaderUserMenu({ session }: { session: Session }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const name = session.user?.name ?? "Account";
  const email = session.user?.email ?? "";
  const image = session.user?.image ?? null;
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={name}
          className="bg-primary text-primary-foreground flex size-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
        >
          {image ? (
            <img src={image} alt={name} className="size-full object-cover" />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-4 text-center text-white">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-white/25 text-base font-bold">
            {initials}
          </div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="truncate text-xs text-white/70">{email}</div>
        </div>
        <div className="p-1.5">
          <DropdownMenuItem>
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setTheme(isDark ? "light" : "dark");
            }}
          >
            {isDark ? (
              <Sun className="mr-2 size-4" />
            ) : (
              <Moon className="mr-2 size-4" />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <div className="bg-border my-1 h-px" />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={async () => {
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/auth/login");
                  },
                },
              });
            }}
          >
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
