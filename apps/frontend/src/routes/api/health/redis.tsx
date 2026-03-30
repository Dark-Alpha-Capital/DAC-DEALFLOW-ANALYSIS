import { createFileRoute } from "@tanstack/react-router";
import { pingRedis } from "@repo/redis-queue/redis";

export const Route = createFileRoute("/api/health/redis")({
  server: {
    handlers: {
      GET: async () => {
        const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
        const ok = await pingRedis(redisUrl);
        if (ok) return Response.json({ ok: true });
        return Response.json(
          { ok: false, error: "Redis ping failed" },
          { status: 503 },
        );
      },
    },
  },
});
