import { and, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { organizationMembers, organizations, users } from "../schema";

export async function getOrganizationById(organizationId: string) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return organization ?? null;
}

export async function getOrganizationBySlug(slug: string) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return organization ?? null;
}

export async function getOrganizationByEmailDomain(domain: string) {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;

  const [organization] = await db
    .select()
    .from(organizations)
    .where(
      sql`EXISTS (
        SELECT 1
        FROM json_each(${organizations.allowedEmailDomains})
        WHERE lower(json_each.value) = ${normalized}
      )`,
    )
    .limit(1);

  return organization ?? null;
}

export async function getUserOrganizationMemberships(userId: string) {
  return db
    .select({
      membershipId: organizationMembers.id,
      role: organizationMembers.role,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      onboardingStatus: organizations.onboardingStatus,
      firmDisplayName: organizations.firmDisplayName,
      primaryEmailDomain: organizations.primaryEmailDomain,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId));
}

export async function getUserMembershipForOrganization(
  userId: string,
  organizationId: string,
) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function getOrganizationMembers(organizationId: string) {
  return db
    .select({
      membershipId: organizationMembers.id,
      role: organizationMembers.role,
      createdAt: organizationMembers.createdAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));
}

export async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  return user ?? null;
}
