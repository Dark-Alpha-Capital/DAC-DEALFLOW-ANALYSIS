import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { AppDb } from "./db-types";

/**
 * Connect Drizzle ORM to a Cloudflare D1 binding.
 *
 * @example
 * ```ts
 * const db = createDb(env.DB);
 * ```
 */
export function createDb(d1: D1Database): AppDb {
  return drizzle(d1, { schema });
}

/** @deprecated Prefer `createDb` */
export const createDbFromD1 = createDb;
