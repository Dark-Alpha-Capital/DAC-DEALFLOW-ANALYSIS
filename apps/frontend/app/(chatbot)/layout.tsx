import React from "react";
import { Metadata } from "next";
import "../globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ChatSidebar from "@/components/sidebars/chat-sidebar";
import { TRPCReactProvider } from "@/trpc/client";
import { ModeToggle } from "@/components/mode-toggle";
import { fontSans, fontMono } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Dark Alpha Capital Deal Sourcing Organization",
  description: "Sourcing and Scrape Deals with AI",
};

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased ${fontSans.variable} ${fontMono.variable}`}>
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
                  <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
                    <SidebarTrigger className="-ml-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium">
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
