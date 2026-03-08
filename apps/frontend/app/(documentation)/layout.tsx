import type { Metadata } from "next";
import "../globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { ModeToggle } from "@/components/mode-toggle";
import { Providers } from "@/components/providers";
import { DocsSidebar } from "@/components/sidebars/docs-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { fontSans, fontMono } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Documentation | Dark Alpha Capital Deal Sourcing Organization",
  description:
    "Product documentation for Dark Alpha Capital Deal Sourcing Organization.",
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased ${fontSans.variable} ${fontMono.variable}`}>
        <Providers>
          <SidebarProvider defaultOpen>
            <DocsSidebar />
            <SidebarInset>
              <header className="bg-background/95 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur md:px-6">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <Link
                    href="/dashboard"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                  >
                    <span aria-hidden>←</span>
                    <span>Back to app</span>
                  </Link>
                </div>
                <ModeToggle />
              </header>
              <div className="px-4 pt-6 pb-12 md:px-8">
                <main className="mx-auto w-full max-w-3xl space-y-6">{children}</main>
              </div>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
