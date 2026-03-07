import type { Metadata } from "next";
import "../globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { TRPCReactProvider } from "@/trpc/client";
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <main className="bg-background min-h-screen">
              <div className="absolute top-4 left-4">
                <Link
                  href="/dashboard"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
                >
                  <span aria-hidden>←</span>
                  <span>Back to app</span>
                </Link>
              </div>
              <div className="absolute top-4 right-4">
                <ModeToggle />
              </div>
              <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-4 pt-20 pb-12">
                <aside className="hidden w-64 shrink-0 border-r pr-4 md:block">
                  <h1 className="mb-4 text-lg font-semibold tracking-tight">
                    Documentation
                  </h1>
                  <nav className="space-y-1 text-sm">
                    <Link
                      href="/docs"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Overview
                    </Link>
                    <Link
                      href="/docs/getting-started"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Getting started
                    </Link>
                    <Link
                      href="/docs/companies"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Companies
                    </Link>
                    <Link
                      href="/docs/documents"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Documents
                    </Link>
                    <Link
                      href="/docs/faq"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      FAQ
                    </Link>
                  </nav>
                </aside>
                <section className="flex-1">
                  <div className="mx-auto w-full max-w-3xl space-y-6">
                    {children}
                  </div>
                </section>
              </div>
            </main>
            <Toaster />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
