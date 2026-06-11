import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { AppDb } from "./db-types";

export function createDbFromD1(d1: D1Database): AppDb {
  return drizzleD1(d1, { schema }) as unknown as AppDb;
}
