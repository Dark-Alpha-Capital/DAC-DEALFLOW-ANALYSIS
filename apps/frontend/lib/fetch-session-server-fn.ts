import { createServerFn } from "@tanstack/react-start";

/**
 * Session for routes/components that must not statically import
 * `@tanstack/react-start/server` (that pulls start-server-core into the client graph).
 */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { auth } = await import("@/auth");
    const request = getRequest();
    return auth.api.getSession({
      headers: request.headers,
    });
  },
);

export const fetchCurrentUserRole = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { auth } = await import("@/auth");
    const request = getRequest();
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return (session?.user as { role?: string } | undefined)?.role;
  },
);
