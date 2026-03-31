import { createFileRoute } from "@tanstack/react-router";
import db, { sql } from "@repo/db";

/** Legacy path name; checks Postgres (background jobs no longer use Redis). */
export const Route = createFileRoute("/api/health/redis")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`SELECT 1`);
          return Response.json({ ok: true, backend: "postgres" });
        } catch {
          return Response.json(
            { ok: false, error: "Database ping failed" },
            { status: 503 },
          );
        }
      },
    },
  },
});
