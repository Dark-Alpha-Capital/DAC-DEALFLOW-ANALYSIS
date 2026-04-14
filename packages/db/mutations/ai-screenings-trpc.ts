import { db } from "..";
import { aiScreenings } from "../schema";
import { eq } from "drizzle-orm";

export async function insertAiScreeningRow(
  values: typeof aiScreenings.$inferInsert,
) {
  const [row] = await db.insert(aiScreenings).values(values).returning();
  return row ?? null;
}

export async function updateAiScreeningById(
  screeningId: string,
  values: {
    title: string;
    explanation: string;
    sentiment: (typeof aiScreenings.$inferSelect)["sentiment"];
  },
) {
  await db.update(aiScreenings)
    .set(values)
    .where(eq(aiScreenings.id, screeningId));
}
