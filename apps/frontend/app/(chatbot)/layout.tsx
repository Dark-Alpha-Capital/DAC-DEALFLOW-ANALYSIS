import React, { Suspense } from "react";
import { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
            <SidebarProvider className="h-svh overflow-hidden">
              <Suspense fallback={null}>
                <ChatSidebar />
              </Suspense>
              <SidebarInset className="min-h-0 overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default layout;
