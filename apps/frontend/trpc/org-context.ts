import { TRPCError } from "@trpc/server";
import { getUserOrganizationMemberships } from "@repo/db/queries";
import { promoteSoleMemberToOwner } from "@repo/db/mutations";
import type { Context } from "./init";

type SessionUser = {
  id?: string;
  activeOrganizationId?: string | null;
  organizationMembershipRole?: string | null;
  role?: string | null;
};

export function getActiveOrganizationId(
  ctx: Pick<Context, "user">,
): string | null {
  return (ctx.user as SessionUser | null)?.activeOrganizationId ?? null;
}

export async function resolveActiveOrganizationId(
  ctx: Pick<Context, "user">,
): Promise<string | null> {
  const fromSession = getActiveOrganizationId(ctx);
  if (fromSession) return fromSession;

  const userId = (ctx.user as SessionUser | null)?.id;
  if (!userId) return null;

  const memberships = await getUserOrganizationMemberships(userId);
  return memberships[0]?.organizationId ?? null;
}

export function requireActiveOrganizationId(
  ctx: Pick<Context, "user">,
): string {
  const organizationId = getActiveOrganizationId(ctx);
  if (!organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No active organization selected",
    });
  }
  return organizationId;
}

export async function requireResolvedOrganizationId(
  ctx: Pick<Context, "user">,
): Promise<string> {
  const organizationId = await resolveActiveOrganizationId(ctx);
  if (!organizationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "No active organization selected",
    });
  }
  return organizationId;
}

export function getOrganizationMembershipRole(
  ctx: Pick<Context, "user">,
): string | null {
  return (ctx.user as SessionUser | null)?.organizationMembershipRole ?? null;
}

export function isOrgAdmin(ctx: Pick<Context, "user">): boolean {
  const role = getOrganizationMembershipRole(ctx);
  const globalRole = (ctx.user as SessionUser | null)?.role;
  return role === "OWNER" || role === "ADMIN" || globalRole === "ADMIN";
}

export async function assertOrgAdmin(
  ctx: Pick<Context, "user">,
  organizationId: string,
): Promise<void> {
  if ((ctx.user as SessionUser | null)?.role === "ADMIN") return;

  const userId = (ctx.user as SessionUser | null)?.id;
  if (!userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization admin required",
    });
  }

  // Repair create-org race: sole member stuck as MEMBER → promote to OWNER.
  await promoteSoleMemberToOwner({ organizationId, userId });

  const memberships = await getUserOrganizationMemberships(userId);
  const membership = memberships.find(
    (row) => row.organizationId === organizationId,
  );
  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "ADMIN")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organization admins can update organization settings",
    });
  }
}
