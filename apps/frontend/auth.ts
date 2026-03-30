import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/db";
import { UserRole } from "@repo/db/enums";
import { users, accounts, sessions, verifications } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { adminEmails } from "./lib/utils";
import {
  sendEmail,
  getVerificationEmailHtml,
  getPasswordResetEmailHtml,
} from "./lib/email";

/**
 * Determine the role of the user based on their email
 */
function determineRole(userEmail: string): UserRole {
  if (adminEmails.includes(userEmail)) {
    return UserRole.ADMIN;
  }
  return UserRole.USER;
}

const ALLOWED_EMAIL_DOMAIN = "darkalphacapital.com";

function assertAllowedDomain(email: string) {
  const normalized = email.toLowerCase();
  const domain = normalized.split("@")[1];

  if (!domain) {
    throw new APIError("BAD_REQUEST", { message: "Invalid email address" });
  }

  if (domain !== ALLOWED_EMAIL_DOMAIN) {
    throw new APIError("UNPROCESSABLE_ENTITY", {
      message: "Only darkalphacapital.com emails are allowed.",
    });
  }
}

function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

/**
 * Canonical site URL for OAuth redirects and cookies. Set in production
 * (`BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL`). If unset, Better Auth derives
 * the origin from each request so dev works on any localhost port.
 */
const explicitPublicUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  undefined;

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  ...(explicitPublicUrl ? { baseURL: explicitPublicUrl } : {}),
  plugins: [tanstackStartCookies()],
  database: drizzleAdapter(db, {
    provider: "pg",
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
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
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
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const rawEmail = (ctx.body?.email as string | undefined) ?? "";
        const email = rawEmail.toLowerCase();

        if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
          throw new APIError("UNAUTHORIZED", {
            message: "Only darkalphacapital.com emails are allowed.",
          });
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email;
          if (!email) {
            throw new APIError("BAD_REQUEST", { message: "Invalid email address" });
          }

          assertAllowedDomain(email);

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

      if (dbUser?.isBlocked || !isAllowedEmail(dbUser?.email)) {
        // Return null to invalidate the session for blocked users
        return null;
      }

      // Add role and isBlocked to session
      return {
        ...session,
        user: {
          ...session.user,
          role: dbUser?.role || "USER",
          isBlocked: dbUser?.isBlocked || false,
        },
      };
    },
  },
  ...(explicitPublicUrl ? { trustedOrigins: [explicitPublicUrl] } : {}),
  onAPIError: {
    errorURL: "/auth/error",
  },
});

// Export types for use in components
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
