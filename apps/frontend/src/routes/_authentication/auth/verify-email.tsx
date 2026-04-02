import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useRouter, useSearchParams } from "@/lib/navigation-shim";
import { authClient } from "@/lib/auth-client";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const error = searchParams.get("error");

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setIsVerifying(true);
    try {
      const response = await authClient.verifyEmail({
        query: { token: verificationToken },
      });

      if (response.error) {
        setVerificationStatus("error");
        setErrorMessage(response.error.message || "Verification failed");
        return;
      }

      setVerificationStatus("success");
      toast.success("Email verified successfully!");
    } catch (err) {
      console.error(err);
      setVerificationStatus("error");
      setErrorMessage("Something went wrong during verification");
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (error === "invalid_token" || error === "INVALID_TOKEN") {
      setVerificationStatus("error");
      setErrorMessage("Invalid or expired verification link");
      return;
    }

    if (token) {
      verifyEmail(token);
    }
  }, [token, error, verifyEmail]);

  async function handleResendEmail() {
    if (!email) {
      toast.error("No email address provided");
      return;
    }

    setIsResending(true);
    try {
      const response = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/",
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to resend email");
        return;
      }

      toast.success("Verification email sent!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  }

  // Token verification view
  if (token || error) {
    return (
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3">
          <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            DAC DEALFLOW
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Email verification</h1>
          </div>
        </header>

        <section className="space-y-4">
          {isVerifying && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Verifying your email…
              </p>
            </div>
          )}

          {verificationStatus === "success" && !isVerifying && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">Email verified</h2>
                <p className="text-sm text-muted-foreground">
                  Your email has been verified successfully.
                </p>
              </div>
              <Button onClick={() => router.push("/auth/login")}>
                Continue to login
              </Button>
            </div>
          )}

          {verificationStatus === "error" && !isVerifying && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">Verification failed</h2>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || "The verification link is invalid or has expired."}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/auth/login">Back to login</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Email sent confirmation view
  return (
    <div className="w-full max-w-md space-y-6">
      <header className="space-y-3">
        <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          DAC DEALFLOW
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification link to{" "}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              "your email address"
            )}
            .
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/40">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Click the link in the email to verify your account.</p>
          <p>
            Didn&apos;t receive the email? Check your spam folder or resend it below.
          </p>
        </div>
        {email && (
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={handleResendEmail}
            disabled={isResending}
          >
            {isResending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Resend verification email
          </Button>
        )}
      </section>

      <footer className="text-center text-sm text-muted-foreground">
        <Link
          href="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      </footer>
    </div>
  );
}

function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

export const Route = createFileRoute("/_authentication/auth/verify-email")({
  head: () => ({ meta: [{ title: "Verify email — Dark Alpha Capital" }] }),
  component: VerifyEmailPage,
});
