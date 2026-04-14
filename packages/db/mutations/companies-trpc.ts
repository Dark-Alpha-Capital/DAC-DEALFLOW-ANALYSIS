import { db } from "..";
import { companies } from "../schema";
import { and, eq, isNull } from "drizzle-orm";

export async function insertCompanyRow(values: typeof companies.$inferInsert) {
  const [added] = await db.insert(companies).values(values).returning();
  return added ?? null;
}

export async function updateCompanyById(
  id: string,
  values: Omit<Partial<typeof companies.$inferInsert>, "id">,
) {
  await db
    .update(companies)
    .set(values)
    .where(and(eq(companies.id, id), isNull(companies.deletedAt)));
}

export async function softDeleteCompanyById(id: string) {
  await db
    .update(companies)
    .set({ deletedAt: new Date() })
    .where(and(eq(companies.id, id), isNull(companies.deletedAt)));
}
