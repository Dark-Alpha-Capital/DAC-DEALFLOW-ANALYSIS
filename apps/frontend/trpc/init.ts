import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import { auth } from "@/auth";
import { getUserOrganizationMemberships } from "@repo/db/queries";

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
  let activeOrganizationId =
    (user as { activeOrganizationId?: string | null }).activeOrganizationId ??
    null;
  let activeOrganizationName =
    (user as { activeOrganizationName?: string | null })
      .activeOrganizationName ?? null;
  let activeOrganizationSlug =
    (user as { activeOrganizationSlug?: string | null })
      .activeOrganizationSlug ?? null;
  let organizationMembershipRole =
    (user as { organizationMembershipRole?: string | null })
      .organizationMembershipRole ?? null;
  let onboardingStatus =
    (user as { onboardingStatus?: string | null }).onboardingStatus ?? null;
  let firmDisplayName =
    (user as { firmDisplayName?: string | null }).firmDisplayName ?? null;

  if (!activeOrganizationId) {
    const memberships = await getUserOrganizationMemberships(user.id);
    const primary = memberships[0] ?? null;
    if (primary) {
      activeOrganizationId = primary.organizationId;
      activeOrganizationName = primary.organizationName;
      activeOrganizationSlug = primary.organizationSlug;
      organizationMembershipRole = primary.role;
      onboardingStatus = primary.onboardingStatus;
      firmDisplayName = primary.firmDisplayName;
    }
  }

  return {
    ...user,
    activeOrganizationId,
    activeOrganizationName,
    activeOrganizationSlug,
    organizationMembershipRole,
    onboardingStatus,
    firmDisplayName,
  };
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