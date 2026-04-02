import { createFileRoute } from "@tanstack/react-router";
import React, { useState, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { useRouter, useSearchParams } from "@/lib/navigation-shim";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { CheckCircle, XCircle, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to reset password");
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Invalid or expired token
  if (error === "INVALID_TOKEN" || error === "invalid_token" || !token) {
    return (
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3">
          <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            DAC DEALFLOW
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Invalid reset link</h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">
            Please request a new password reset link to continue.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/forgot-password">Request new link</Link>
          </Button>
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

  // Success state
  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3">
          <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            DAC DEALFLOW
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Password reset</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been updated successfully.
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <Button
            onClick={() => router.push("/auth/login")}
            className="w-full"
          >
            Continue to login
          </Button>
        </section>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="w-full max-w-md space-y-6">
      <header className="space-y-3">
        <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          DAC DEALFLOW
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a new password for your Dark Alpha Capital account.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/40">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Reset password
            </Button>
          </form>
        </Form>
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

function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

export const Route = createFileRoute("/_authentication/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Dark Alpha Capital" }] }),
  component: ResetPasswordPage,
});
