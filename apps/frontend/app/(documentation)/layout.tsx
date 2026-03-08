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
                    <div className="space-y-1 pl-3">
                      <p className="text-muted-foreground px-2 pt-1 text-[11px] font-medium tracking-wide uppercase">
                        Company Workflows
                      </p>
                      <Link
                        href="/docs/companies#company-coverage"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Company coverage
                      </Link>
                      <Link
                        href="/docs/companies#workflow-add-contact"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Add contact
                      </Link>
                      <Link
                        href="/docs/companies#workflow-add-outreach"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Add outreach
                      </Link>
                      <Link
                        href="/docs/companies#workflow-add-notes"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Add notes
                      </Link>
                      <Link
                        href="/docs/companies#workflow-assign-theme"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Assign theme
                      </Link>
                    </div>
                    <Link
                      href="/docs/leads"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Leads
                    </Link>
                    <div className="space-y-1 pl-3">
                      <p className="text-muted-foreground px-2 pt-1 text-[11px] font-medium tracking-wide uppercase">
                        Lead Workflow
                      </p>
                      <Link
                        href="/docs/leads#lead-entity-model"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Lead vs Company
                      </Link>
                      <Link
                        href="/docs/leads#lead-resolution-actions"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Supported actions
                      </Link>
                      <Link
                        href="/docs/leads#action-convert-to-company"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Convert to company
                      </Link>
                      <Link
                        href="/docs/leads#action-mark-duplicate"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Mark duplicate
                      </Link>
                      <Link
                        href="/docs/leads#action-reject-lead"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Reject lead
                      </Link>
                      <Link
                        href="/docs/leads#action-clear-duplicate"
                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1 text-xs"
                      >
                        Clear duplicate
                      </Link>
                    </div>
                    <Link
                      href="/docs/deals"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Deals pipeline
                    </Link>
                    <Link
                      href="/docs/themes"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Themes
                    </Link>
                    <Link
                      href="/docs/documents"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Documents
                    </Link>
                    <Link
                      href="/docs/screenings"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Screenings
                    </Link>
                    <Link
                      href="/docs/analytics"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Analytics
                    </Link>
                    <Link
                      href="/docs/jobs"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Jobs
                    </Link>
                    <Link
                      href="/docs/admin"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      Admin access
                    </Link>
                    <Link
                      href="/docs/faq"
                      className="text-muted-foreground hover:bg-accent hover:text-accent-foreground block rounded px-2 py-1"
                    >
                      FAQ
                    </Link>
                  </nav>

                  <div className="mt-8 space-y-3 border-t pt-4">
                    <h2 className="text-sm font-semibold tracking-tight">
                      Theme Operations Playbook
                    </h2>
                    <div className="text-muted-foreground space-y-3 text-xs">
                      <p>
                        Themes now run as a full operating workflow: strategy
                        definition, thesis versioning, market intelligence,
                        company coverage, and performance feedback.
                      </p>

                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          1. Theme management
                        </p>
                        <p>
                          Use themes as strategic sourcing lanes. Each theme
                          carries status, priority, and conviction while
                          preserving history through soft-delete instead of hard
                          removal.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          2. Thesis version lifecycle
                        </p>
                        <p>
                          Maintain one active thesis at a time. Editing a thesis
                          creates a new version and archives the previous one,
                          preserving narrative evolution across market cycles.
                        </p>
                        <p>
                          Thesis structure: summary, macro drivers, mispricing
                          hypothesis, value creation levers, exit logic, and
                          risk factors.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          3. Industry intelligence versioning
                        </p>
                        <p>
                          Store market facts as versioned snapshots: TAM,
                          growth, margins, entry/exit multiples, fragmentation,
                          sponsor penetration, cyclicality, and disruption risk.
                        </p>
                        <p>
                          This gives a dated evidence trail for why a theme
                          stayed active, paused, or retired.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          4. Company mapping and coverage
                        </p>
                        <p>
                          Companies mapped to a theme can now be tracked with
                          coverage status, last outreach date, and notes. This
                          prevents missed follow-ups, duplicate touches, and
                          sourcing blind spots.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          5. Theme performance snapshots
                        </p>
                        <p>
                          Track deals sourced, meetings, LOIs, closed deals,
                          entry multiple, and IRR by snapshot. You can review
                          trend lines and compare themes by output quality, not
                          just activity volume.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          6. Daily PE operating value
                        </p>
                        <p>
                          In daily execution, this framework improves
                          prioritization, partner review quality, and IC
                          readiness by connecting strategic intent to measurable
                          sourcing outcomes.
                        </p>
                        <p>
                          End-to-end flow: Create Theme → Manage Thesis → Add
                          Industry Intelligence → Map and Cover Companies →
                          Process Leads/Deals → Measure Theme Performance.
                        </p>
                      </div>
                    </div>
                  </div>
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
