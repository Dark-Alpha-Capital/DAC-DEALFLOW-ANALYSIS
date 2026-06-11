import { or, sql, type Column, type SQL } from "drizzle-orm";

/** Case-insensitive LIKE for SQLite / D1 (Postgres `ilike` equivalent). */
export function ilike(column: Column, pattern: string): SQL {
  return sql`lower(${column}) like lower(${pattern})`;
}

/** JSON string-array overlap (Postgres `arrayOverlaps` equivalent). */
export function jsonArrayOverlaps(
  column: Column,
  values: string[],
): SQL | undefined {
  if (values.length === 0) return undefined;
  return or(
    ...values.map(
      (value) =>
        sql`exists (select 1 from json_each(${column}) where json_each.value = ${value})`,
    ),
  )!;
}
