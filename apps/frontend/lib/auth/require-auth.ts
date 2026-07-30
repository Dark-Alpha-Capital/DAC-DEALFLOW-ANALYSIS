import { redirect } from "@tanstack/react-router";
import {
  fetchSession,
  fetchSessionWithOrganization,
} from "@/lib/server/fetch-session-server-fn";

/**
 * Use in a route's `beforeLoad`. Layout routes `_protected/route.tsx`,
 * `_chatbot/route.tsx`, and `_onboarding/route.tsx` call this so
 * unauthenticated users never reach child loaders.
 */
export async function requireAuthenticatedUser() {
  const session = await fetchSession();
  if (!session?.user) {
    throw redirect({ to: "/auth/login" });
  }
  return session;
}

export async function requireActiveOrganization() {
  const session = await fetchSessionWithOrganization();
  if (!session?.user) {
    throw redirect({ to: "/auth/login" });
  }

  const activeOrganizationId = (
    session.user as { activeOrganizationId?: string | null }
  ).activeOrganizationId;

  if (!activeOrganizationId) {
    throw redirect({ to: "/onboarding" });
  }

  return session;
}
