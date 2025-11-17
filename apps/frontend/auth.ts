import NextAuth, { DefaultSession } from "next-auth";
import { User, UserRole } from "@prisma/client";
import authConfig from "./auth.config";
import { getCurrentUserByEmail } from "./lib/data/current-user";
import { determineRole } from "./lib/utils";
import db from "db";

declare module "next-auth" {
  interface Session {
    user: {
      role: UserRole;
      isOAuth: boolean;
    } & DefaultSession["user"];
    accessToken?: string;
    error?: string;
  }
}

declare module "next-auth" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    user?: {
      id: string;
      email: string;
      name?: string;
      image?: string;
    };
    error?: string;
  }
}

const nextAuth = NextAuth({
  session: { strategy: "jwt" },
  debug: true,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : 0,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          },
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, return token with error
      return {
        ...token,
        error: "AccessTokenExpired",
      };
    },
    async session({ session, token }) {
      // Send properties to the client
      // Ensure session.user exists and is an object
      if (token && typeof token.user === "object" && token.user !== null) {
        session.user = {
          ...session.user,
          ...(token.user as {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
          }),
        };
        if (
          typeof token.accessToken === "string" ||
          typeof token.accessToken === "undefined"
        ) {
          session.accessToken = token.accessToken;
        }
        if (
          typeof token.error === "string" ||
          typeof token.error === "undefined"
        ) {
          session.error = token.error;
        }
      }

      // Hydrate additional user data from database
      if (session.user?.email) {
        try {
          const dbUser = await db.user.findUnique({
            where: { email: session.user.email },
          });
          if (dbUser) {
            session.user.role = dbUser.role as UserRole;
            session.user.isOAuth = true;
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }
      }

      return session;
    },
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // Check if user is blocked
        const currentUser = await getCurrentUserByEmail(user.email);
        if (currentUser?.isBlocked) {
          return false;
        }

        // Ensure user exists in database and role is set
        const userRole = determineRole(user.email);
        await db.user.upsert({
          where: { email: user.email },
          update: {
            role: userRole,
            name: user.name,
            image: user.image,
            emailVerified: new Date(),
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: userRole,
            emailVerified: new Date(),
          },
        });

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
  },
  ...authConfig,
});

export const handlers = nextAuth.handlers;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
export const auth: typeof nextAuth.auth = nextAuth.auth;
