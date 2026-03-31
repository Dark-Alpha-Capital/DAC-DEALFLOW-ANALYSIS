import { createFileRoute } from "@tanstack/react-router";
import React, { useTransition } from "react";
import { Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginFormValues) {
    startTransition(async () => {
      try {
        const response = await authClient.signIn.email({
          email: data.email,
          password: data.password,
          callbackURL: "/",
        });

        if (response.error) {
          if (response.error.status === 403) {
            toast.error("Please verify your email before signing in");
            router.push(
              "/auth/verify-email?email=" + encodeURIComponent(data.email),
            );
            return;
          }
          toast.error(response.error.message || "Invalid email or password");
          return;
        }

        toast.success("Welcome back!");
        router.push("/");
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  function handleGoogleSignIn() {
    startTransition(async () => {
      try {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: "/",
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to sign in with Google");
      }
    });
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <header className="space-y-3">
        <div className="text-muted-foreground text-xs font-semibold tracking-[0.2em]">
          DAC DEALFLOW
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to access your internal dealflow workspace.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={handleGoogleSignIn}
          disabled={isPending}
        >
          <FaGoogle className="size-4" />
          <span className="text-sm font-medium">Sign in with Google</span>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@darkalphacapital.com"
                      {...field}
                      disabled={isPending}
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
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Password</FormLabel>
                    <Link
                      to="/auth/forgot-password"
                      className="text-muted-foreground hover:text-primary text-xs underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder="Enter your password"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </Form>
      </section>

      <footer className="space-y-2 text-center">
        <p className="text-muted-foreground text-sm">
          Don&apos;t have an account?{" "}
          <Link
            to="/auth/signup"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
        <p className="text-muted-foreground text-xs">
          Access is limited to Dark Alpha Capital team members.
        </p>
        <p className="text-muted-foreground/80 text-xs">
          Powered by{" "}
          <span className="text-primary font-semibold">Dark Alpha Capital</span>
        </p>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/_authentication/auth/login")({
  head: () => ({ meta: [{ title: "Login — Dark Alpha Capital" }] }),
  component: LoginPage,
});
