import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/auth";

export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    return auth.api.getSession({
      headers: request.headers,
    });
  },
);
