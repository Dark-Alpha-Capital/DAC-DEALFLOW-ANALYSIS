import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/auth";
import { resolveOrganizationContext } from "@/lib/server/session-organization";

/**
 * Session for routes/components that must not statically import
 * `@tanstack/react-start/server` (that pulls start-server-core into the client graph).
 */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    return auth.api.getSession({
      headers: request.headers,
    });
  },
);

/**
 * Session with membership fallback for activeOrganizationId.
 * Use in protected route guards so stale/missing session enrichment
 * does not bounce users with real org memberships to onboarding.
 */
export const fetchSessionWithOrganization = createServerFn({
  method: "GET",
}).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) return null;

  const org = await resolveOrganizationContext(
    session.user as Parameters<typeof resolveOrganizationContext>[0],
  );

  return {
    ...session,
    user: {
      ...session.user,
      ...org,
    },
  };
});

export const fetchCurrentUserRole = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return (session?.user as { role?: string } | undefined)?.role;
  },
);
