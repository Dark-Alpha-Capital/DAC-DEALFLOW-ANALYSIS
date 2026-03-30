import "@tanstack/react-start/server-only";

import { auth } from "@/auth";
import { getRequest } from "@tanstack/react-start/server";

export async function getSession() {
  const request = getRequest();
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}
