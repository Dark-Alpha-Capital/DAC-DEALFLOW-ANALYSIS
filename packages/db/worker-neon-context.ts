import { AsyncLocalStorage } from "node:async_hooks";
import { neonConfig } from "@neondatabase/serverless";
import type { Pool } from "@neondatabase/serverless";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

export type WorkerNeonDbStore = {
  pool: Pool;
  db: PostgresJsDatabase<typeof schema>;
};

export const workerNeonDbAls = new AsyncLocalStorage<WorkerNeonDbStore>();

let neonConfiguredForWorkers = false;

/** Neon Pool uses WebSockets; Workers need global WebSocket + fetch wired once. */
export function ensureNeonConfiguredForCloudflareWorkers(): void {
  if (neonConfiguredForWorkers || !isCloudflareWorkersRuntime()) return;
  neonConfiguredForWorkers = true;
  neonConfig.webSocketConstructor = WebSocket;
  (neonConfig as unknown as Record<string, unknown>).fetch = fetch;
}

export function isCloudflareWorkersRuntime(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Cloudflare-Workers/i.test(
    (navigator as { userAgent?: string }).userAgent ?? "",
  );
}

export function isNeonHost(connectionString: string): boolean {
  const host = connectionString.match(
    /^postgres(?:ql)?:\/\/(?:[^@]+@)?([^/?:]+)/,
  )?.[1];
  return host != null && host.includes("neon.tech");
}
