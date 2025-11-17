import type { Metadata } from "next";
import "../globals.css";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import MenuDialog from "@/components/Dialogs/menu-dialog";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/Footer";
import { SessionProvider } from "next-auth/react";
import { raleway, bitter } from "@/app/fonts";
import { Suspense } from "react";

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
            <main>
              <MenuDialog />
              <Suspense fallback={<div className="h-16 w-full" />}>
                <Header />
              </Suspense>

              {children}
              <Footer />
            </main>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
