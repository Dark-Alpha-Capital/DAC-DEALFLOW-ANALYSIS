import { eq } from "drizzle-orm";
import { db } from "..";
import { views } from "../schema";

export type ViewRecord = typeof views.$inferSelect;

export async function getViewsByTrackerId(
  trackerId: string,
): Promise<ViewRecord[]> {
  return db.select().from(views).where(eq(views.trackerId, trackerId));
}

export async function getViewById(
  viewId: string,
): Promise<ViewRecord | null> {
  const [row] = await db
    .select()
    .from(views)
    .where(eq(views.id, viewId))
    .limit(1);
  return row ?? null;
}
