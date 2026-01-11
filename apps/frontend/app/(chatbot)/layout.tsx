import React from "react";
import { Metadata } from "next";
import "../globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import { raleway, bitter } from "@/app/fonts";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ChatSidebar from "@/components/sidebars/chat-sidebar";
import { TRPCReactProvider } from "@/trpc/client";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata: Metadata = {
  title: "Dark Alpha Capital Deal Sourcing Organization",
  description: "Sourcing and Scrape Deals with AI",
};

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html
      lang="en"
      className={cn(raleway.variable, bitter.variable)}
      suppressHydrationWarning
    >
      <body className={`antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <SessionProvider>
              <SidebarProvider>
                <ChatSidebar />
                <SidebarInset>
                  <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <SidebarTrigger className="-ml-1" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        Chat
                      </p>
                    </div>
                    <ModeToggle />
                  </header>
                  <div className="flex-1">
                    <div className="mx-auto w-full max-w-5xl p-4 md:p-6 lg:p-8">
                      {children}
                    </div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </SessionProvider>
            <Toaster />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default layout;
