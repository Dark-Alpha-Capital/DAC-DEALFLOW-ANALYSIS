import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Re-export enums first (no drizzle/postgres) for shared types/constants
export * from "./enums";
// Re-export everything from schema
export * from "./schema";

// Re-export drizzle operators
export {
  eq,
  and,
  or,
  sql,
  asc,
  desc,
  inArray,
  count,
  gte,
  lte,
  isNull,
  isNotNull,
  ne,
  gt,
  lt,
  like,
  ilike,
  between,
  notInArray,
} from "drizzle-orm";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set!");
  throw new Error("DATABASE_URL is required");
}

declare global {
  // eslint-disable-next-line no-var
  var postgresClient: postgres.Sql | undefined;
}

const client =
  globalThis.postgresClient ??
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => { },
    debug: process.env.NODE_ENV === "development" ? console.log : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.postgresClient = client;
}

export const db = drizzle(client, { schema });

// Default export for convenience
export default db;
