import { eq, type SQL, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/** Restrict a query to one organization. Returns false when org is missing. */
export function organizationFilter(
  column: SQLiteColumn,
  organizationId: string | null | undefined,
): SQL | undefined {
  if (!organizationId) {
    return undefined;
  }
  return eq(column, organizationId);
}

/** Combine org filter with existing conditions; empty result when org is missing. */
export function withOrganizationScope(
  column: SQLiteColumn,
  organizationId: string | null | undefined,
  ...conditions: (SQL | undefined)[]
): SQL {
  const orgCondition = organizationFilter(column, organizationId);
  if (!orgCondition) {
    return sql`false`;
  }
  const active = conditions.filter((c): c is SQL => c != null);
  if (active.length === 0) {
    return orgCondition;
  }
  return sql`(${orgCondition}) AND (${sql.join(active, sql` AND `)})`;
}
