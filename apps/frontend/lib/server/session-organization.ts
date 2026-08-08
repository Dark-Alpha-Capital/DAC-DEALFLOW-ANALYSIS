import { getUserOrganizationMemberships } from "@repo/db/queries";

/**
 * The organization context attached to a signed-in user: their active
 * organization (if any) plus the fields describing it.
 */
export type OrganizationContext = {
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  activeOrganizationSlug: string | null;
  organizationMembershipRole: string | null;
  onboardingStatus: string | null;
  firmDisplayName: string | null;
};

export type SessionUserLike = {
  id: string;
  activeOrganizationId?: string | null;
  activeOrganizationName?: string | null;
  activeOrganizationSlug?: string | null;
  organizationMembershipRole?: string | null;
  onboardingStatus?: string | null;
  firmDisplayName?: string | null;
};

/**
 * Resolve a user's organization context. Prefers the session-enriched fields
 * (populated by the better-auth session callback); when those are missing —
 * better-auth can strip custom session fields — falls back to the user's first
 * organization membership. Single implementation shared by tRPC context, server
 * functions, and route guards so org resolution behaves identically everywhere.
 */
export async function resolveOrganizationContext(
  user: SessionUserLike,
): Promise<OrganizationContext> {
  const fromSession: OrganizationContext = {
    activeOrganizationId: user.activeOrganizationId ?? null,
    activeOrganizationName: user.activeOrganizationName ?? null,
    activeOrganizationSlug: user.activeOrganizationSlug ?? null,
    organizationMembershipRole: user.organizationMembershipRole ?? null,
    onboardingStatus: user.onboardingStatus ?? null,
    firmDisplayName: user.firmDisplayName ?? null,
  };

  if (fromSession.activeOrganizationId) return fromSession;

  const memberships = await getUserOrganizationMemberships(user.id);
  const primary = memberships[0] ?? null;
  if (!primary) return fromSession;

  return {
    activeOrganizationId: primary.organizationId,
    activeOrganizationName: primary.organizationName,
    activeOrganizationSlug: primary.organizationSlug,
    organizationMembershipRole: primary.role,
    onboardingStatus: primary.onboardingStatus,
    firmDisplayName: primary.firmDisplayName,
  };
}
