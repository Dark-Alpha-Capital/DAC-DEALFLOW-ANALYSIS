import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/auth";
import { getUserOrganizationMemberships } from "@repo/db/queries";

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

  let activeOrganizationId = (
    session.user as { activeOrganizationId?: string | null }
  ).activeOrganizationId;
  let onboardingStatus = (
    session.user as { onboardingStatus?: string | null }
  ).onboardingStatus;
  let organizationMembershipRole = (
    session.user as { organizationMembershipRole?: string | null }
  ).organizationMembershipRole;
  let activeOrganizationName = (
    session.user as { activeOrganizationName?: string | null }
  ).activeOrganizationName;
  let activeOrganizationSlug = (
    session.user as { activeOrganizationSlug?: string | null }
  ).activeOrganizationSlug;
  let firmDisplayName = (
    session.user as { firmDisplayName?: string | null }
  ).firmDisplayName;

  if (!activeOrganizationId) {
    const memberships = await getUserOrganizationMemberships(session.user.id);
    const primary = memberships[0] ?? null;
    if (primary) {
      activeOrganizationId = primary.organizationId;
      onboardingStatus = primary.onboardingStatus;
      organizationMembershipRole = primary.role;
      activeOrganizationName = primary.organizationName;
      activeOrganizationSlug = primary.organizationSlug;
      firmDisplayName = primary.firmDisplayName;
    }
  }

  return {
    ...session,
    user: {
      ...session.user,
      activeOrganizationId,
      onboardingStatus,
      organizationMembershipRole,
      activeOrganizationName,
      activeOrganizationSlug,
      firmDisplayName,
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
