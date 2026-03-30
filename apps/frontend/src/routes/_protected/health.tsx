import { createFileRoute } from "@tanstack/react-router";
import { RedisConnectionStatus } from "@/components/health/redis-connection-status";

export const Route = createFileRoute("/_protected/health")({
  head: () => ({
    meta: [{ title: "Health — Dark Alpha Capital" }],
  }),
  component: RedisConnectionStatus,
});
