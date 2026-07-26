import { createAuthClient } from "better-auth/react";

/** Always same-origin in the browser so local/prod never cross-talk. */
export function getAuthClientBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:3001";
}

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
});

export const useSession = authClient.useSession;
