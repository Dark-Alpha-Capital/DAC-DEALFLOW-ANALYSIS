import { db } from "../index";
import { projectTrackers, projectKickoffs } from "../schema";
import { desc, eq, inArray } from "drizzle-orm";

type TrackerContent = { type: string; sourceId: string };

function parseContent(raw: string | null): TrackerContent | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrackerContent;
  } catch {
    return null;
  }
}

export async function getAllProjectTrackers() {
  const trackers = await db
    .select()
    .from(projectTrackers)
    .orderBy(desc(projectTrackers.createdAt));

  if (trackers.length === 0) return [];

  // Collect kickoff IDs from content JSON
  const kickoffIds: string[] = [];
  for (const t of trackers) {
    const parsed = parseContent(t.content);
    if (parsed?.type === "project-kickoff" && parsed.sourceId) {
      kickoffIds.push(parsed.sourceId);
    }
  }

  const kickoffMap = new Map<
    string,
    {
      department: string | null;
      screeningStatus: string;
      screeningScore: number | null;
    }
  >();

  if (kickoffIds.length > 0) {
    const kickoffs = await db
      .select({
        id: projectKickoffs.id,
        department: projectKickoffs.department,
        screeningStatus: projectKickoffs.screeningStatus,
        screeningScore: projectKickoffs.screeningScore,
      })
      .from(projectKickoffs)
      .where(inArray(projectKickoffs.id, kickoffIds));

    for (const k of kickoffs) {
      kickoffMap.set(k.id, {
        department: k.department,
        screeningStatus: k.screeningStatus,
        screeningScore: k.screeningScore,
      });
    }
  }

  return trackers.map((t) => {
    const parsed = parseContent(t.content);
    const sourceId = parsed?.sourceId ?? null;
    const kickoff = sourceId ? kickoffMap.get(sourceId) : undefined;
    return {
      id: t.id,
      name: t.name,
      content: t.content,
      createdAt: t.createdAt,
      createdBy: t.createdBy,
      sourceType: parsed?.type ?? null,
      sourceId,
      department: kickoff?.department ?? null,
      screeningStatus: kickoff?.screeningStatus ?? null,
      screeningScore: kickoff?.screeningScore ?? null,
    };
  });
}

export async function getProjectTrackerById(trackerId: string) {
  const [tracker] = await db
    .select()
    .from(projectTrackers)
    .where(eq(projectTrackers.id, trackerId));

  if (!tracker) return null;

  const parsed = parseContent(tracker.content);
  if (!parsed || parsed.type !== "project-kickoff" || !parsed.sourceId) {
    return { tracker, kickoff: null };
  }

  const [kickoff] = await db
    .select()
    .from(projectKickoffs)
    .where(eq(projectKickoffs.id, parsed.sourceId));

  return { tracker, kickoff: kickoff ?? null };
}
