import { AsyncLocalStorage } from "node:async_hooks";
import type { AppDb } from "./db-types";

export type D1DbStore = {
  db: AppDb;
};

export const workerD1DbAls = new AsyncLocalStorage<D1DbStore>();

export function isCloudflareWorkersRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    "Cloudflare" in globalThis &&
    (globalThis as { Cloudflare?: { compatibilityFlags?: unknown } })
      .Cloudflare?.compatibilityFlags !== undefined
  );
}
