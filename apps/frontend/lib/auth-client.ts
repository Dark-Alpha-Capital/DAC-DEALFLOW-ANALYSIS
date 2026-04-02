import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.VITE_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export useSession hook for convenience
export const useSession = authClient.useSession;
