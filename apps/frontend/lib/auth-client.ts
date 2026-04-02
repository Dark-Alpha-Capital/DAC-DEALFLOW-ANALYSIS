import { createAuthClient } from "better-auth/react";

function getAuthClientBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
});

// Export useSession hook for convenience
export const useSession = authClient.useSession;
