import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { isAllowedWorkEmail } from "@/lib/utils";
import { FaGoogle } from "react-icons/fa6";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .email("Please enter a valid email")
      .refine(isAllowedWorkEmail, {
        message: "Only @darkalphacapital.com email addresses are allowed.",
      }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    try {
      const response = await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: "/",
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to create account");
        return;
      }

      toast.success("Account created! Please check your email to verify.");
      router.push("/auth/verify-email?email=" + encodeURIComponent(data.email));
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign up with Google");
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <header className="space-y-3">
        <div className="text-muted-foreground text-xs font-semibold tracking-[0.2em]">
          PROJECT TRACKERS
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-muted-foreground text-sm">
            Use your Dark Alpha Capital email to join the project tracking
            workspace.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FaGoogle className="size-4" />
          )}
          <span className="text-sm font-medium">Sign up with Google</span>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              Or continue with email
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work email</FormLabel>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
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
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput
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
              Create account
            </Button>
          </form>
        </Form>
      </section>

      <footer className="space-y-2 text-center">
        <p className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="text-muted-foreground/80 text-xs">
          Powered by{" "}
          <span className="text-primary font-semibold">Dark Alpha Capital</span>
        </p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/_authentication/auth/signup")({
  head: () => ({ meta: [{ title: "Sign up — Project Trackers" }] }),
  component: SignupPage,
});
