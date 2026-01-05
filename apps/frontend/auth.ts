import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "db";
import { users, accounts, sessions, verifications, UserRole } from "db/schema";
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

export const auth: ReturnType<typeof betterAuth> = betterAuth({
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
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Determine role based on email (admin emails get ADMIN role)
          const role = determineRole(user.email);
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
        .select({ isBlocked: users.isBlocked, role: users.role })
        .from(users)
        .where(eq(users.id, user.id));

      if (dbUser?.isBlocked) {
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
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
});

// Export types for use in components
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
