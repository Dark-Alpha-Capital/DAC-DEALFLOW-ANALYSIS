import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import "../globals.css";
import { raleway, bitter } from "@/app/fonts";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata: Metadata = {
  title: "Dark Alpha Capital Deal Sourcing Organization",
  description: "Sourcing and Scrape Deals with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(raleway.variable, bitter.variable)} suppressHydrationWarning>
      <body className={`antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="absolute top-4 right-4">
              <ModeToggle />
            </div>
            <div className="min-h-screen flex items-center justify-center p-4">
              {children}
            </div>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
