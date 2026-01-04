import React from "react";

import type { Metadata } from "next";
import "../globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import MenuDialog from "@/components/Dialogs/menu-dialog";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import { raleway, bitter } from "@/app/fonts";
import { Suspense } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { cookies } from "next/headers";

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
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <SidebarProvider>
              <Suspense>
                <AppSidebar />
              </Suspense>
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                  <SidebarTrigger />
                  <div className="flex-1" />
                </header>
                <div className="flex flex-1 flex-col">
                  <main className="flex-1">
                    <MenuDialog />
                    <Suspense fallback={<div className="h-16 w-full" />}>
                      {children}
                    </Suspense>
                  </main>
                  <Footer />
                </div>
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
