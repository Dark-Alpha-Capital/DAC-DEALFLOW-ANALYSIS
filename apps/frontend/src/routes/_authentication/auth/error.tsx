import { createFileRoute, Link } from "@tanstack/react-router";
import React, { Suspense } from "react";
import ErrorCard from "@/components/authentication/ErrorCard";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

function AuthErrorPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <header className="space-y-3">
        <div className="text-muted-foreground text-xs font-semibold tracking-[0.2em]">
          DAC DEALFLOW
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Authentication error</h1>
          <p className="text-muted-foreground text-sm">
            Something went wrong while signing you in.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="border-destructive/40 inline-flex h-12 w-12 items-center justify-center rounded-full border">
          <AlertCircle className="text-destructive h-6 w-6" />
        </div>
        <div className="space-y-3">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-2">
                <div className="text-muted-foreground text-sm">
                  Loading error details...
                </div>
              </div>
            }
          >
            <ErrorCard />
          </Suspense>
        </div>
      </section>

      <footer className="space-y-3">
        <Button asChild className="w-full">
          <Link to="/auth/login">Try again</Link>
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Access is limited to Dark Alpha Capital team members.
        </p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/_authentication/auth/error")({
  head: () => ({ meta: [{ title: "Auth error — Dark Alpha Capital" }] }),
  component: AuthErrorPage,
});
