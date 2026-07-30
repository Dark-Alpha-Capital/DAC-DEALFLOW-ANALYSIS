import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  createOrganization,
  ensureOrganizationMemberRole,
  insertOrganizationMember,
  removeOrganizationMember,
  updateOrganizationById,
  updateOrganizationMemberRole,
} from "@repo/db/mutations";
import {
  getOrganizationByEmailDomain,
  getOrganizationById,
  getOrganizationBySlug,
  getOrganizationMembers,
  getUserByEmail,
  getUserMembershipForOrganization,
  getUserOrganizationMemberships,
} from "@repo/db/queries";
import { ensureDefaultCriteriaProfile } from "@repo/deal-screening";
import {
  assertOrgAdmin,
  isOrgAdmin,
  requireResolvedOrganizationId,
  resolveActiveOrganizationId,
} from "../org-context";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required"),
  domain: z.string().trim().min(3, "Email domain is required"),
});

const inviteMemberSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

export const organizationsRouter = createTRPCRouter({
  getOnboardingState: protectedProcedure.query(async ({ ctx }) => {
    const userEmail = String(ctx.user.email || "").toLowerCase();
    const domain = userEmail.split("@")[1] || null;
    const memberships = await getUserOrganizationMemberships(ctx.user.id);
    const matchingOrganization = domain
      ? await getOrganizationByEmailDomain(domain)
      : null;
    const activeOrganizationId = await resolveActiveOrganizationId(ctx);
    const activeMembership =
      memberships.find((row) => row.organizationId === activeOrganizationId) ??
      memberships[0] ??
      null;

    return {
      memberships,
      userEmail,
      suggestedDomain: domain,
      matchingOrganization:
        matchingOrganization &&
        !memberships.some((row) => row.organizationId === matchingOrganization.id)
          ? matchingOrganization
          : null,
      activeOrganizationId,
      onboardingStatus: activeMembership?.onboardingStatus ?? null,
      activeOrganizationName: activeMembership?.organizationName ?? null,
    };
  }),

  getActiveOrganization: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await resolveActiveOrganizationId(ctx);
    if (!organizationId) return null;

    const [organization, memberships] = await Promise.all([
      getOrganizationById(organizationId),
      getUserOrganizationMemberships(ctx.user.id),
    ]);
    if (!organization) return null;

    const membership =
      memberships.find((row) => row.organizationId === organizationId) ?? null;

    return {
      ...organization,
      membershipRole: membership?.role ?? null,
      canManage: isOrgAdmin(ctx),
    };
  }),

  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await requireResolvedOrganizationId(ctx);
    const members = await getOrganizationMembers(organizationId);
    return {
      members,
      canManage: isOrgAdmin(ctx),
      currentUserId: ctx.user.id,
    };
  }),

  inviteMember: protectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireResolvedOrganizationId(ctx);
      await assertOrgAdmin(ctx, organizationId);

      const email = input.email.trim().toLowerCase();
      const user = await getUserByEmail(email);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No account found for that email. They need to sign up first, then you can add them.",
        });
      }

      const existing = await getUserMembershipForOrganization(
        user.id,
        organizationId,
      );
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That user is already a member of this organization",
        });
      }

      const member = await insertOrganizationMember({
        organizationId,
        userId: user.id,
        role: input.role,
      });

      if (!member) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add member",
        });
      }

      return member;
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireResolvedOrganizationId(ctx);
      await assertOrgAdmin(ctx, organizationId);

      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      const existing = await getUserMembershipForOrganization(
        input.userId,
        organizationId,
      );
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      if (existing.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the OWNER role",
        });
      }

      const updated = await updateOrganizationMemberRole({
        organizationId,
        userId: input.userId,
        role: input.role,
      });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update member role",
        });
      }

      return updated;
    }),

  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireResolvedOrganizationId(ctx);
      await assertOrgAdmin(ctx, organizationId);

      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself",
        });
      }

      const existing = await getUserMembershipForOrganization(
        input.userId,
        organizationId,
      );
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      if (existing.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the organization owner",
        });
      }

      const removed = await removeOrganizationMember({
        organizationId,
        userId: input.userId,
      });

      if (!removed) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove member",
        });
      }

      return { success: true };
    }),

  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const existingMemberships = await getUserOrganizationMemberships(ctx.user.id);
      if (existingMemberships.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already belong to an organization",
        });
      }

      const slug = slugify(input.name);
      if (!slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization slug could not be generated",
        });
      }

      const existingSlug = await getOrganizationBySlug(slug);
      if (existingSlug) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An organization with that name already exists",
        });
      }

      const domain = input.domain.toLowerCase().replace(/^@/, "");
      const organization = await createOrganization({
        name: input.name,
        slug,
        firmDisplayName: input.name,
        primaryEmailDomain: domain,
        allowedEmailDomains: [domain],
        onboardingStatus: "INCOMPLETE",
      });

      if (!organization) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create organization",
        });
      }

      await ensureOrganizationMemberRole({
        organizationId: organization.id,
        userId: ctx.user.id,
        role: "OWNER",
      });

      await ensureDefaultCriteriaProfile(organization.id);

      return organization;
    }),

  joinOrganizationByDomain: protectedProcedure.mutation(async ({ ctx }) => {
    const existingMemberships = await getUserOrganizationMemberships(ctx.user.id);
    if (existingMemberships.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You already belong to an organization",
      });
    }

    const userEmail = String(ctx.user.email || "").toLowerCase();
    const domain = userEmail.split("@")[1];
    if (!domain) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Your account is missing an email domain",
      });
    }

    const organization = await getOrganizationByEmailDomain(domain);
    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No organization matches your email domain",
      });
    }

    const existingMembership = await getUserMembershipForOrganization(
      ctx.user.id,
      organization.id,
    );
    if (!existingMembership) {
      await insertOrganizationMember({
        organizationId: organization.id,
        userId: ctx.user.id,
      });
    }

    await ensureDefaultCriteriaProfile(organization.id);
    return organization;
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await resolveActiveOrganizationId(ctx);
    if (!organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Create or join an organization first",
      });
    }

    await assertOrgAdmin(ctx, organizationId);
    await ensureDefaultCriteriaProfile(organizationId);
    await updateOrganizationById(organizationId, {
      onboardingStatus: "COMPLETE",
      onboardingCompletedAt: new Date(),
    });

    return { success: true };
  }),

  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await resolveActiveOrganizationId(ctx);
    if (!organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Create or join an organization first",
      });
    }

    await ensureDefaultCriteriaProfile(organizationId);
    await updateOrganizationById(organizationId, {
      onboardingStatus: "INCOMPLETE",
    });

    return { success: true };
  }),
});
