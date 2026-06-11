import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./schema";

/** Drizzle handle backed by Cloudflare D1. */
export type AppDb = DrizzleD1Database<typeof schema>;
