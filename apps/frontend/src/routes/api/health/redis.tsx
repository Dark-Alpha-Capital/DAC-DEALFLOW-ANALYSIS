import { createFileRoute } from "@tanstack/react-router";
import db, { sql } from "@repo/db";
import { withWorkerDbIfNeeded } from "@/lib/with-worker-db";

/** Legacy path name; pings the active Drizzle database (D1 or local SQLite). */
export const Route = createFileRoute("/api/health/redis")({
  server: {
    handlers: {
      GET: async () =>
        withWorkerDbIfNeeded(async () => {
          try {
            await db.execute(sql`SELECT 1`);
            return Response.json({ ok: true, backend: "d1" });
          } catch {
            return Response.json(
              { ok: false, error: "Database ping failed" },
              { status: 503 },
            );
          }
        }),
    },
  },
});
