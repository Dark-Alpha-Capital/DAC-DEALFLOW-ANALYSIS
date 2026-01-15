import { auth } from "@/auth";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * Get the current session on the server side
 * Use this in Server Components and Server Actions
 * Cached per-request to prevent duplicate calls
 */
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Get the current user from the session
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}
