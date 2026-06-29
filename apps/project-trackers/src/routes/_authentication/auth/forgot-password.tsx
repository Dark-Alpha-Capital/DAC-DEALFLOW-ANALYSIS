import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { isAllowedWorkEmail } from "@/lib/utils";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
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

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .refine(isAllowedWorkEmail, {
      message: "Only @darkalphacapital.com email addresses are allowed.",
    }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const response = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/auth/reset-password",
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to send reset email");
        return;
      }

      setSubmittedEmail(data.email);
      setIsEmailSent(true);
      toast.success("Password reset email sent!");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isEmailSent) {
    return (
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3">
          <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            DAC DEALFLOW
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-foreground">
                {submittedEmail}
              </span>
              .
            </p>
          </div>
        </header>

        <section className="space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Click the link in the email to reset your password.</p>
            <p>
              The link will expire in 1 hour. If you don&apos;t see the email,
              check your spam folder.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={() => {
              setIsEmailSent(false);
              form.reset();
            }}
          >
            <Mail className="size-4" />
            <span className="text-sm font-medium">Try a different email</span>
          </Button>
        </section>

        <footer className="text-center text-sm text-muted-foreground">
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <header className="space-y-3">
        <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          DAC DEALFLOW
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Forgot password?</h1>
          <p className="text-sm text-muted-foreground">
            Enter your work email and we&apos;ll send you a link to reset your password.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@darkalphacapital.com"
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
              Send reset link
            </Button>
          </form>
        </Form>
      </section>

      <footer className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          to="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/_authentication/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Dark Alpha Capital" }] }),
  component: ForgotPasswordPage,
});
