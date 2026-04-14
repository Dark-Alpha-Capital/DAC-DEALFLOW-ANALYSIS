import { auth } from "@/auth";

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
  const { getRequest } = await import("@tanstack/react-start/server");
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
