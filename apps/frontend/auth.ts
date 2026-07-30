import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/db";
import {
  users,
  accounts,
  sessions,
  verifications,
  organizationMembers,
  organizations,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { adminEmails } from "./lib/utils";
import {
  createOrganization,
  insertOrganizationMember,
} from "@repo/db/mutations";
import { getOrganizationByEmailDomain } from "@repo/db/queries";
import {
  sendEmail,
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
} from "./lib/email";
import { getServerEnv } from "./lib/env.server";

/**
 * Determine the role of the user based on their email
 */
function determineRole(userEmail: string): string {
  if (adminEmails.includes(userEmail)) {
    return "ADMIN";
  }
  return "USER";
}

async function ensureMembershipForSessionUser(user: {
  id: string;
  email?: string | null;
  role?: string | null;
}) {
  const email = user.email?.toLowerCase().trim();
  if (!email) return;
  const domain = email.split("@")[1];
  if (!domain) return;

  const [existingMembership] = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  if (existingMembership) {
    return;
  }

  let organization = await getOrganizationByEmailDomain(domain);
  if (!organization && domain === "darkalphacapital.com") {
    organization = await createOrganization({
      name: "Dark Alpha Capital",
      slug: "dark-alpha-capital",
      firmDisplayName: "Dark Alpha Capital",
      primaryEmailDomain: domain,
      allowedEmailDomains: [domain],
      onboardingStatus: "COMPLETE",
    });
  }

  if (!organization) {
    return;
  }

  await insertOrganizationMember({
    organizationId: organization.id,
    userId: user.id,
    role: user.role === "ADMIN" ? "OWNER" : "MEMBER",
  });
}

function getAuthBaseUrl(): string {
  const fromEnv = getServerEnv().BETTER_AUTH_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  baseURL: getAuthBaseUrl(),
  /** When env is missing/wrong, still trust the origin this request hit (same as browser Origin on same-host deploys). */
  trustedOrigins: (request) => {
    if (!request?.url) return [];
    try {
      return [new URL(request.url).origin];
    } catch {
      return [];
    }
  },
  plugins: [tanstackStartCookies()],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: users,
      account: accounts,
      session: sessions,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const html = await getPasswordResetEmailHtml(url);
      await sendEmail({
        to: user.email,
        subject: "Reset your password - DAC DealFlow",
        html,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const html = await getVerificationEmailHtml(url);
      await sendEmail({
        to: user.email,
        subject: "Verify your email - DAC DealFlow",
        html,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: getServerEnv().AUTH_GOOGLE_ID ?? "",
      clientSecret: getServerEnv().AUTH_GOOGLE_SECRET ?? "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    // Cookie cache freezes session-callback fields (activeOrganizationId,
    // onboardingStatus). Those change during onboarding, so keep it off.
    cookieCache: {
      enabled: false,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
      isBlocked: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async () => {}),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email;
          if (!email) {
            throw new APIError("BAD_REQUEST", { message: "Invalid email address" });
          }

          // Determine role based on email (admin emails get ADMIN role)
          const role = determineRole(email.toLowerCase());
          return {
            data: {
              ...user,
              role,
              isBlocked: false,
            },
          };
        },
      },
    },
  },
  callbacks: {
    session: async ({ session, user }: { session: any; user: any }) => {
      // Check if user is blocked
      const [dbUser] = await db
        .select({
          isBlocked: users.isBlocked,
          role: users.role,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, user.id));

      await ensureMembershipForSessionUser({
        id: user.id,
        email: dbUser?.email ?? user.email,
        role: dbUser?.role ?? user.role,
      });

      if (dbUser?.isBlocked) {
        // Return null to invalidate the session for blocked users
        return null;
      }

      const memberships = await db
        .select({
          organizationId: organizations.id,
          organizationName: organizations.name,
          organizationSlug: organizations.slug,
          onboardingStatus: organizations.onboardingStatus,
          membershipRole: organizationMembers.role,
          firmDisplayName: organizations.firmDisplayName,
        })
        .from(organizationMembers)
        .innerJoin(
          organizations,
          eq(organizationMembers.organizationId, organizations.id),
        )
        .where(eq(organizationMembers.userId, user.id));

      const primaryMembership = memberships[0] ?? null;

      // Add role and isBlocked to session
      return {
        ...session,
        user: {
          ...session.user,
          email: dbUser?.email || session.user.email,
          role: dbUser?.role || "USER",
          isBlocked: dbUser?.isBlocked || false,
          activeOrganizationId: primaryMembership?.organizationId ?? null,
          activeOrganizationName: primaryMembership?.organizationName ?? null,
          activeOrganizationSlug: primaryMembership?.organizationSlug ?? null,
          organizationMembershipRole: primaryMembership?.membershipRole ?? null,
          onboardingStatus: primaryMembership?.onboardingStatus ?? null,
          firmDisplayName: primaryMembership?.firmDisplayName ?? null,
        },
      };
    },
  },
  onAPIError: {
    errorURL: "/auth/error",
  },
});

// Export types for use in components
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
