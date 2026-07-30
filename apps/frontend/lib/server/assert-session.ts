import { auth } from "@/auth";
import { getRequest } from "@tanstack/react-start/server";
import { getUserOrganizationMemberships } from "@repo/db/queries";

/** Thrown when a server function requires auth the caller does not have. */
export class ServerFnAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ServerFnAuthError";
    this.status = status;
  }
}

export async function assertAuthenticated() {
  const request = getRequest();
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) {
    throw new ServerFnAuthError("Unauthorized", 401);
  }
  return session;
}

export async function assertAdmin() {
  const session = await assertAuthenticated();
  if ((session.user as { role?: string }).role !== "ADMIN") {
    throw new ServerFnAuthError("Forbidden", 403);
  }
  return session;
}

export function getActiveOrganizationIdFromSession(
  session: Awaited<ReturnType<typeof assertAuthenticated>>,
): string | null {
  return (
    (session.user as { activeOrganizationId?: string | null })
      .activeOrganizationId ?? null
  );
}

/**
 * Resolve active org from session, then memberships table.
 * better-auth often strips custom session-callback fields that are not
 * registered as additionalFields, so route loaders must not rely on
 * activeOrganizationId being present on getSession alone.
 */
export async function resolveActiveOrganizationIdFromSession(
  session: Awaited<ReturnType<typeof assertAuthenticated>>,
): Promise<string | null> {
  const fromSession = getActiveOrganizationIdFromSession(session);
  if (fromSession) return fromSession;

  const memberships = await getUserOrganizationMemberships(session.user.id);
  return memberships[0]?.organizationId ?? null;
}

export async function assertActiveOrganization() {
  const session = await assertAuthenticated();
  const organizationId = await resolveActiveOrganizationIdFromSession(session);
  if (!organizationId) {
    throw new ServerFnAuthError("No active organization", 403);
  }
  return { session, organizationId };
}
