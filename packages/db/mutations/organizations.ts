import { db } from "..";
import { and, eq } from "drizzle-orm";
import { organizationMembers, organizations } from "../schema";

export async function createOrganization(input: {
  name: string;
  slug: string;
  firmDisplayName: string;
  primaryEmailDomain: string | null;
  allowedEmailDomains: string[];
  onboardingStatus?: "NOT_STARTED" | "INCOMPLETE" | "COMPLETE";
}) {
  const [organization] = await db
    .insert(organizations)
    .values({
      name: input.name,
      slug: input.slug,
      firmDisplayName: input.firmDisplayName,
      primaryEmailDomain: input.primaryEmailDomain,
      allowedEmailDomains: input.allowedEmailDomains,
      onboardingStatus: input.onboardingStatus ?? "NOT_STARTED",
    })
    .returning();

  return organization ?? null;
}

export async function updateOrganizationById(
  organizationId: string,
  values: Partial<typeof organizations.$inferInsert>,
) {
  const [updated] = await db
    .update(organizations)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return updated ?? null;
}

export async function insertOrganizationMember(input: {
  organizationId: string;
  userId: string;
  role?: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const [member] = await db
    .insert(organizationMembers)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role ?? "MEMBER",
    })
    .onConflictDoNothing()
    .returning();

  return member ?? null;
}

/**
 * Ensure membership exists at the given role.
 * Always wins on conflict so org creators stay OWNER even if a concurrent
 * domain auto-join inserted MEMBER first.
 */
export async function ensureOrganizationMemberRole(input: {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const [member] = await db
    .insert(organizationMembers)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
    })
    .onConflictDoUpdate({
      target: [
        organizationMembers.organizationId,
        organizationMembers.userId,
      ],
      set: {
        role: input.role,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (member) return member;

  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.userId),
      ),
    )
    .limit(1);

  return existing ?? null;
}

/**
 * If this user is the only member and not already OWNER/ADMIN, promote to OWNER.
 * Repairs the create-org race where domain auto-join inserted MEMBER first.
 */
export async function promoteSoleMemberToOwner(input: {
  organizationId: string;
  userId: string;
}) {
  const members = await db
    .select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, input.organizationId));

  if (members.length !== 1 || members[0]?.userId !== input.userId) {
    return members[0] ?? null;
  }

  if (members[0].role === "OWNER" || members[0].role === "ADMIN") {
    return members[0];
  }

  return ensureOrganizationMemberRole({
    organizationId: input.organizationId,
    userId: input.userId,
    role: "OWNER",
  });
}

export async function updateOrganizationMemberRole(input: {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const [updated] = await db
    .update(organizationMembers)
    .set({
      role: input.role,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.userId),
      ),
    )
    .returning();

  return updated ?? null;
}

export async function removeOrganizationMember(input: {
  organizationId: string;
  userId: string;
}) {
  const [removed] = await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, input.userId),
      ),
    )
    .returning();

  return removed ?? null;
}
