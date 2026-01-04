"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { MdMenu, MdClose } from "react-icons/md";
import {
  FiPlus,
  FiList,
  FiCheckSquare,
  FiEdit,
  FiTrendingUp,
  FiSearch,
  FiClock,
} from "react-icons/fi";
import { FiHome } from "react-icons/fi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, Lock, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { FaScrewdriver } from "react-icons/fa";
type NavLinkType = {
  navlink: string;
  navlabel: string;
  icon: any;
}[];

export const NavLinks: NavLinkType = [
  { navlink: "/new-deal", navlabel: "New", icon: FiPlus },
  { navlink: "/raw-deals", navlabel: "Raw", icon: FiList },
  { navlink: "/published-deals", navlabel: "Published", icon: FiCheckSquare },
  { navlink: "/screeners", navlabel: "Screener", icon: FaScrewdriver },
  { navlink: "/companies", navlabel: "Companies", icon: FiHome },
  { navlink: "/job-history", navlabel: "History", icon: FiClock },
  // { navlink: "/rollups", navlabel: "Rollups", icon: HiChevronUp },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  // Handle scroll detection for backdrop blur effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Add admin-specific link if user is an admin
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const dynamicNavLinks = isAdmin
    ? [...NavLinks, { navlink: "/admin", navlabel: "Admin", icon: Lock }]
    : NavLinks;

  const isLoading = isPending;

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full transition-all duration-300 ease-in-out",
        isScrolled
          ? "bg-background/95 shadow-sm backdrop-blur-md"
          : "bg-background",
        "border-b border-border/40 px-4 py-3 lg:px-8",
      )}
    >
      <nav aria-label="Main-navigation" className="mx-auto max-w-7xl">
        <ul className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <NameLogo />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
            >
              <MdMenu className="h-6 w-6" />
            </Button>
          </div>
          <DesktopMenu pathname={pathname} dynamicLinks={dynamicNavLinks} />
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  Loading...
                </span>
              </div>
            ) : session ? (
              <ProfileMenu session={session} />
            ) : (
              <AuthDialogNavs />
            )}
          </div>
        </ul>
      </nav>
      <MobileMenu
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        pathname={pathname}
        dynamicLinks={dynamicNavLinks}
      />
    </header>
  );
};

export default Header;

function NameLogo() {
  return (
    <Link
      href="/"
      aria-label="Home page"
      className="text-xl font-bold tracking-tight text-primary transition-all duration-200 hover:scale-105 hover:text-primary/80 sm:text-2xl"
    >
      DAC DEALFLOW
    </Link>
  );
}

function DesktopMenu({
  pathname,
  dynamicLinks,
}: {
  pathname: string;
  dynamicLinks: NavLinkType;
}) {
  return (
    <div className="hidden gap-1 md:flex">
      {dynamicLinks.map((item, index) => {
        const isActive = pathname === item.navlink;
        return (
          <Link
            href={item.navlink}
            key={`${item.navlink}-${index}`}
            className={clsx(
              "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              "hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon
              className={clsx(
                "h-4 w-4 transition-transform duration-200",
                isActive && "scale-110",
                "group-hover:scale-110",
              )}
            />
            <span>{item.navlabel}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

function MobileMenu({
  isOpen,
  setIsOpen,
  pathname,
  dynamicLinks,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  pathname: string;
  dynamicLinks: NavLinkType;
}) {
  useEffect(() => {
    // Prevent body scroll when menu is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      {/* Menu Panel */}
      <div
        className={clsx(
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border/40 bg-background p-6 shadow-xl transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <NameLogo />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-accent"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <MdClose className="h-6 w-6" />
          </Button>
        </div>
        <nav className="mt-6">
          <ul className="space-y-1">
            {dynamicLinks.map((item, index) => {
              const isActive = pathname === item.navlink;
              return (
                <li key={`${item.navlink}-${index}`}>
                  <Link
                    href={item.navlink}
                    onClick={() => setIsOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.navlabel}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

function AuthDialogNavs() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="text-sm font-medium">
        <Link href="/auth/login">Sign In</Link>
      </Button>
    </div>
  );
}

function ProfileMenu({ session }: { session: { user: any; session: any } }) {
  const router = useRouter();
  const userInitials =
    session.user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar className="h-8 w-8 border-2 border-border">
          <AvatarImage
            src={session.user?.image || undefined}
            alt={session.user?.name || "User"}
          />
          <AvatarFallback className="text-xs font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden items-center gap-1 text-sm font-medium sm:flex">
          <span className="max-w-[120px] truncate">
            {session.user?.name || "Account"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => {
            router.push(`/profile/${session.user?.id}`);
          }}
          className="cursor-pointer"
        >
          Profile
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
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
