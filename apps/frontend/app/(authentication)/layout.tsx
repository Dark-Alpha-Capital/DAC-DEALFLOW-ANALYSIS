import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { raleway, bitter } from "@/app/fonts";

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
    <html lang="en" className={cn(raleway.variable, bitter.variable)}>
      <body className={`antialiased`}>
        <main>
          <div>{children}</div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
