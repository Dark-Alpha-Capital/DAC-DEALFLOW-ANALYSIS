import { eq } from "drizzle-orm";
import { db } from "..";
import { screeners } from "../schema";
import type { DepartmentValue, ScreenerCategoryValue } from "../schema";

export async function insertScreenerTemplate(
  values: typeof screeners.$inferInsert,
) {
  const [created] = await db.insert(screeners).values(values).returning();
  return created ?? null;
}

export async function updateScreenerTemplateById(
  screenerId: string,
  values: {
    name: string;
    category: ScreenerCategoryValue;
    description: string | null;
    content: string | null;
    department: DepartmentValue | null;
  },
) {
  await db
    .update(screeners)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(screeners.id, screenerId));
}

export async function deleteScreenerById(screenerId: string) {
  await db.delete(screeners).where(eq(screeners.id, screenerId));
}
