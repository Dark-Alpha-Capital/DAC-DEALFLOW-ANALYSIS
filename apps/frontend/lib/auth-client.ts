import { createAuthClient } from "better-auth/react";

function getAuthBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    import.meta.env.NEXT_PUBLIC_APP_URL ||
    import.meta.env.VITE_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});

// Export useSession hook for convenience
export const useSession = authClient.useSession;
