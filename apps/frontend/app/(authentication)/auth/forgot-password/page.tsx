"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
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
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
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
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto mb-2">
              <div className="text-2xl font-bold tracking-tight text-primary">
                DAC DEALFLOW
              </div>
            </div>
            <div className="mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-muted">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-base">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-foreground">
                {submittedEmail}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Click the link in the email to reset your password.</p>
              <p className="mt-2">
                The link will expire in 1 hour. If you don&apos;t see the email,
                check your spam folder.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsEmailSent(false);
                form.reset();
              }}
            >
              <Mail className="mr-2 size-4" />
              Try a different email
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="inline-flex items-center font-medium text-primary underline-offset-4 hover:underline"
              >
                <ArrowLeft className="mr-1 size-4" />
                Back to Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-2 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto mb-2">
            <div className="text-2xl font-bold tracking-tight text-primary">
              DAC DEALFLOW
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-base">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                        placeholder="you@example.com"
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
                Send Reset Link
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
