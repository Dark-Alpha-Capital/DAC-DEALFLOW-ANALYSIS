import Link from "next/link";
import "./globals.css";
import { fontSans, fontMono } from "@/app/fonts";
import { Button } from "@/components/ui/button";
import { Home, FileQuestion } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased ${fontSans.variable} ${fontMono.variable} min-h-screen bg-background`}
      >
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <FileQuestion className="text-muted-foreground h-16 w-16" />
            <h1 className="text-4xl font-bold tracking-tight">404</h1>
            <p className="text-muted-foreground max-w-sm">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>
          <Button asChild>
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </body>
    </html>
  );
}
