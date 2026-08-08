import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import { auth } from "@/auth";
import { resolveOrganizationContext } from "@/lib/server/session-organization";
import { assertOrgAdmin, requireResolvedOrganizationId } from "./org-context";

async function enrichSessionUserWithOrganization<T extends { id: string }>(
  user: T,
): Promise<
  T & {
    activeOrganizationId: string | null;
    activeOrganizationName: string | null;
    activeOrganizationSlug: string | null;
    organizationMembershipRole: string | null;
    onboardingStatus: string | null;
    firmDisplayName: string | null;
  }
> {
  const org = await resolveOrganizationContext(user);
  return { ...user, ...org };
}

export async function createTRPCContext() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const user = session?.user
    ? await enrichSessionUserWithOrganization(session.user)
    : null;

  return {
    session: session
      ? {
          ...session,
          user: user ?? session.user,
        }
      : null,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if ((ctx.user as { role?: string }).role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  return next({ ctx });
});

/**
 * Resolves the caller's active organization (session field, then membership
 * fallback) and injects it into the context. Throws PRECONDITION_FAILED when
 * the caller has no active organization.
 */
export const organizationProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const organizationId = await requireResolvedOrganizationId(ctx);
    return next({ ctx: { ...ctx, organizationId } });
  },
);

/**
 * Like organizationProcedure, but also requires the caller to be an
 * organization admin (OWNER/ADMIN role, or a global ADMIN).
 */
export const organizationAdminProcedure = organizationProcedure.use(
  async ({ ctx, next }) => {
    await assertOrgAdmin(ctx, ctx.organizationId);
    return next({ ctx });
  },
);