import { redirect } from "@tanstack/react-router";
import { fetchSession } from "@/lib/fetch-session-server-fn";

/**
 * Use in a route's `beforeLoad`. Layout routes `_protected/route.tsx` and
 * `_chatbot/route.tsx` call this so unauthenticated users never reach child loaders.
 */
export async function requireAuthenticatedUser() {
  const session = await fetchSession();
  if (!session?.user) {
    throw redirect({ to: "/auth/login" });
  }
  return session;
}
