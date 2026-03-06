import React, { Suspense } from "react";
import ErrorCard from "./ErrorCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

const AuthErrorPage = async () => {
  return (
    <div className="w-full max-w-md space-y-6">
      <header className="space-y-3">
        <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          DAC DEALFLOW
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Authentication error</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong while signing you in.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-3">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-2">
                <div className="text-sm text-muted-foreground">
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
          <Link href="/auth/login">Try again</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Access is limited to Dark Alpha Capital team members.
        </p>
      </footer>
    </div>
  );
};

export default AuthErrorPage;
