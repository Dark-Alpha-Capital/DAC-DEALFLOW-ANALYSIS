import { auth } from "@/auth";

export async function requireKickoffSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return null;
  }
  return session;
}
