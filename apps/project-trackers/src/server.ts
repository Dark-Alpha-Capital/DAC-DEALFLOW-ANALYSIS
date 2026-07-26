import handler from "@tanstack/react-start/server-entry";
import { runDbWithD1 } from "@repo/db-tracker";
export { ProjectKickoffScreenWorkflow } from "./workflows/project-kickoff-screen.workflow";

/**
 * Plane embeds this app in a sandboxed iframe (often without allow-same-origin),
 * so document.ORIGIN is the string "null". ES modules + API calls then need CORS.
 */
function embedCorsHeaders(request: Request): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, trpc-accept, x-trpc-source",
    "Access-Control-Max-Age": "86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "frame-ancestors *",
  });

  const origin = request.headers.get("Origin");
  if (!origin || origin === "null") {
    headers.set("Access-Control-Allow-Origin", "null");
    headers.set("Access-Control-Allow-Credentials", "true");
  } else if (
    origin === "http://localhost:3001" ||
    origin === "http://127.0.0.1:3001" ||
    origin === "https://projects.darkalphacapital.com" ||
    origin === "https://tracker.darkalphacapital.com" ||
    origin === "https://plane.darkalphacapital.com" ||
    origin.endsWith(".darkalphacapital.com")
  ) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  return headers;
}

function withEmbedHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const cors = embedCorsHeaders(request);
  cors.forEach((value, key) => {
    headers.set(key, value);
  });
  headers.delete("X-Frame-Options");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const start = handler as {
  fetch: (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ) => Response | Promise<Response>;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: embedCorsHeaders(request),
      });
    }

    if (!env.DB) {
      console.error("[server] env.DB missing — D1 binding not available");
      return new Response("Database binding unavailable", { status: 500 });
    }

    // One D1 ALS scope for the whole request (auth, server fns, tRPC, SSR).
    return runDbWithD1(env.DB, async () => {
      const response = await start.fetch(request, env, ctx);
      return withEmbedHeaders(request, response);
    });
  },
};
