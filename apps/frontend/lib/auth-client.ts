import { createAuthClient } from "better-auth/react";

export function getAuthClientBaseUrl(): string {
  // Browser: always same-origin (VITE_PUBLIC_APP_URL is baked at build time and may be localhost).
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
});

// Export useSession hook for convenience
export const useSession = authClient.useSession;
