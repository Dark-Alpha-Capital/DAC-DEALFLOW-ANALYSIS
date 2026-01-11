import React from "react";

import type { Metadata } from "next";
import "../globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { raleway, bitter } from "@/app/fonts";
import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TRPCReactProvider } from "@/trpc/client";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata: Metadata = {
  title: "Dark Alpha Capital Deal Sourcing Organization",
  description: "Sourcing and Scrape Deals with AI",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <SidebarProvider>
              <Suspense>
                <AppSidebar />
              </Suspense>
              <SidebarInset>
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger className="-ml-1" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      Dealflow
                    </p>
                  </div>
                  <ModeToggle />
                </header>
                <div className="flex flex-1 flex-col">
                  <div className="flex-1">
                    <Suspense fallback={<div className="h-16 w-full" />}>
                      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
                        {children}
                      </div>
                    </Suspense>
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
}
