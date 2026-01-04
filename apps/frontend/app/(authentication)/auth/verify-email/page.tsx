"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-2">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto mb-2">
              <div className="text-2xl font-bold tracking-tight text-primary">
                DAC DEALFLOW
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">
              Email Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isVerifying && (
              <div className="flex flex-col items-center space-y-4 py-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying your email...</p>
              </div>
            )}

            {verificationStatus === "success" && !isVerifying && (
              <div className="flex flex-col items-center space-y-4 py-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Email Verified!</h3>
                  <p className="text-muted-foreground mt-1">
                    Your email has been verified successfully.
                  </p>
                </div>
                <Button onClick={() => router.push("/auth/login")} className="mt-4">
                  Continue to Login
                </Button>
              </div>
            )}

            {verificationStatus === "error" && !isVerifying && (
              <div className="flex flex-col items-center space-y-4 py-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">Verification Failed</h3>
                  <p className="text-muted-foreground mt-1">
                    {errorMessage || "The verification link is invalid or has expired."}
                  </p>
                </div>
                <Button variant="outline" asChild className="mt-4">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email sent confirmation view
  return (
    <div className="w-full max-w-md">
      <Card className="shadow-lg border-2">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-2">
            <div className="text-2xl font-bold tracking-tight text-primary">
              DAC DEALFLOW
            </div>
          </div>
          <div className="mx-auto">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-base">
            We&apos;ve sent a verification link to{" "}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              "your email address"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Click the link in the email to verify your account.</p>
            <p className="mt-2">
              Didn&apos;t receive the email? Check your spam folder or click below to
              resend.
            </p>
          </div>
          {email && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Resend Verification Email
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <Card className="shadow-lg border-2">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
