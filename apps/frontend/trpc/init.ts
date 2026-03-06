import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import { cache } from "react";
import { getSession } from "@/lib/auth-server";

export const createTRPCContext = cache(async () => {
  const session = await getSession();

  return {
    session,
    user: session?.user ?? null,
  };
});

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

// Public procedure - no authentication required
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
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

// Admin procedure - requires admin role
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if ((ctx.user as any).role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to perform this action",
    });
  }

  return next({ ctx });
});
