import { eq } from "drizzle-orm";
import { db } from "..";
import { initiatives, initiativeTrackers } from "../schema";

export type InitiativeRecord = typeof initiatives.$inferSelect;

export async function getAllInitiatives(): Promise<InitiativeRecord[]> {
  return db.select().from(initiatives).orderBy(initiatives.createdAt);
}

export async function getInitiativeById(
  initiativeId: string,
): Promise<InitiativeRecord | null> {
  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);
  return row ?? null;
}

export async function getTrackerIdsForInitiative(
  initiativeId: string,
): Promise<string[]> {
  const rows = await db
    .select({ trackerId: initiativeTrackers.trackerId })
    .from(initiativeTrackers)
    .where(eq(initiativeTrackers.initiativeId, initiativeId));
  return rows.map((r) => r.trackerId);
}

export async function getInitiativeIdsForTracker(
  trackerId: string,
): Promise<string[]> {
  const rows = await db
    .select({ initiativeId: initiativeTrackers.initiativeId })
    .from(initiativeTrackers)
    .where(eq(initiativeTrackers.trackerId, trackerId));
  return rows.map((r) => r.initiativeId);
}
