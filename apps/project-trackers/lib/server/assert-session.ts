import { auth } from "@/auth";
import { getRequest } from "@tanstack/react-start/server";

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
