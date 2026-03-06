import type { Metadata } from "next";
import "../globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { TRPCReactProvider } from "@/trpc/client";

export const metadata: Metadata = {
  title: "Documentation | Dark Alpha Capital Deal Sourcing Organization",
  description: "Product documentation for Dark Alpha Capital Deal Sourcing Organization.",
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <main className="min-h-screen bg-background">
              <div className="absolute left-4 top-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span aria-hidden>←</span>
                  <span>Back to app</span>
                </Link>
              </div>
              <div className="absolute right-4 top-4">
                <ModeToggle />
              </div>
              <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-4 pb-12 pt-20">
                <aside className="hidden w-64 shrink-0 border-r pr-4 md:block">
                  <h1 className="mb-4 text-lg font-semibold tracking-tight">
                    Documentation
                  </h1>
                  <nav className="space-y-1 text-sm">
                    <Link
                      href="/docs"
                      className="block rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Overview
                    </Link>
                    <Link
                      href="/docs/getting-started"
                      className="block rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Getting started
                    </Link>
                    <Link
                      href="/docs/companies"
                      className="block rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Companies
                    </Link>
                    <Link
                      href="/docs/documents"
                      className="block rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Documents
                    </Link>
                    <Link
                      href="/docs/faq"
                      className="block rounded px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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

