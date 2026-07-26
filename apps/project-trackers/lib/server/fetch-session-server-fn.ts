import { auth } from "@/auth";
import { createDbServerFn } from "@/lib/server/create-db-server-fn";

export const fetchSession = createDbServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    return auth.api.getSession({
      headers: request.headers,
    });
  },
);
