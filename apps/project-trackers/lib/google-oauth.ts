import { getAuthClientBaseUrl } from "@/lib/auth-client";

/** Start Google OAuth via a plain fetch (avoids client-lib redirect quirks). */
export async function startGoogleOAuth(callbackURL = "/") {
  const baseURL = getAuthClientBaseUrl();
  const endpoint = `${baseURL}/api/auth/sign-in/social`;
  console.info("[auth] google oauth start", { baseURL, endpoint });

  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "google",
      callbackURL,
      disableRedirect: true,
    }),
  });

  const payload = (await res.json().catch(() => null)) as {
    url?: string;
    message?: string;
    error?: string;
  } | null;

  console.info("[auth] google oauth response", { status: res.status, payload });

  if (!res.ok) {
    throw new Error(
      payload?.message || payload?.error || `Google sign-in failed (${res.status})`,
    );
  }

  if (!payload?.url) {
    throw new Error("Google sign-in did not return a redirect URL");
  }

  window.location.assign(payload.url);
}
