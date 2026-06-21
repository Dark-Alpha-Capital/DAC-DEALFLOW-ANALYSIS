import { createFileRoute } from "@tanstack/react-router";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { FaGoogle } from "react-icons/fa6";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function LoginPage() {
  const [isPending, startTransition] = useTransition();

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
          DARK ALPHA CAPITAL
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            Welcome to Project Trackers
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This site is used to manage all projects currently being worked on
            at the firm — track kickoffs, screening scores, and project status
            in one place.
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
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FaGoogle className="size-4" />
          )}
          <span className="text-sm font-medium">Sign in with Google</span>
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          Please sign in with your{" "}
          <span className="text-foreground font-medium">
            @darkalphacapital.com
          </span>{" "}
          email account.
        </p>
      </section>

      <footer className="space-y-2 text-center">
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
  head: () => ({ meta: [{ title: "Login — Project Trackers" }] }),
  component: LoginPage,
});
