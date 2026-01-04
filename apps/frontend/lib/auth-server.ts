import { auth } from "@/auth";
import { headers } from "next/headers";

/**
 * Get the current session on the server side
 * Use this in Server Components and Server Actions
 */
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Get the current user from the session
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}
