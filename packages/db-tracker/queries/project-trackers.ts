import { db } from "../index";
import {
  projectTrackers,
  projectKickoffs,
  projectKickoffScreenings,
} from "../schema";
import { desc, eq, inArray } from "drizzle-orm";

export type ProjectKickoffScreeningSummary = {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  score: number | null;
  analysis: string | null;
  workflowInstanceId: string | null;
  screenedAt: Date | null;
  createdAt: Date;
};

async function loadLatestScreeningsByKickoffIds(
  kickoffIds: string[],
): Promise<Map<string, ProjectKickoffScreeningSummary>> {
  const map = new Map<string, ProjectKickoffScreeningSummary>();
  if (kickoffIds.length === 0) return map;

  const rows = await db
    .select({
      id: projectKickoffScreenings.id,
      kickoffId: projectKickoffScreenings.kickoffId,
      status: projectKickoffScreenings.status,
      score: projectKickoffScreenings.score,
      analysis: projectKickoffScreenings.analysis,
      workflowInstanceId: projectKickoffScreenings.workflowInstanceId,
      screenedAt: projectKickoffScreenings.screenedAt,
      createdAt: projectKickoffScreenings.createdAt,
    })
    .from(projectKickoffScreenings)
    .where(inArray(projectKickoffScreenings.kickoffId, kickoffIds))
    .orderBy(
      projectKickoffScreenings.kickoffId,
      desc(projectKickoffScreenings.createdAt),
    );

  for (const row of rows) {
    if (!map.has(row.kickoffId)) {
      map.set(row.kickoffId, {
        id: row.id,
        status: row.status,
        score: row.score,
        analysis: row.analysis,
        workflowInstanceId: row.workflowInstanceId,
        screenedAt: row.screenedAt,
        createdAt: row.createdAt,
      });
    }
  }

  return map;
}

export async function getProjectKickoffById(kickoffId: string) {
  const [kickoff] = await db
    .select()
    .from(projectKickoffs)
    .where(eq(projectKickoffs.id, kickoffId))
    .limit(1);

  if (!kickoff) return null;

  const screeningMap = await loadLatestScreeningsByKickoffIds([kickoffId]);
  return {
    kickoff,
    latestScreening: screeningMap.get(kickoffId) ?? null,
  };
}

export async function getProjectKickoffScreeningByJobId(jobId: string) {
  const [row] = await db
    .select({
      id: projectKickoffScreenings.id,
      kickoffId: projectKickoffScreenings.kickoffId,
      status: projectKickoffScreenings.status,
      score: projectKickoffScreenings.score,
      analysis: projectKickoffScreenings.analysis,
      workflowInstanceId: projectKickoffScreenings.workflowInstanceId,
      screenedAt: projectKickoffScreenings.screenedAt,
      createdAt: projectKickoffScreenings.createdAt,
    })
    .from(projectKickoffScreenings)
    .where(eq(projectKickoffScreenings.workflowInstanceId, jobId))
    .limit(1);

  return row ?? null;
}

export async function getAllProjectTrackers() {
  const trackers = await db
    .select({
      id: projectTrackers.id,
      name: projectTrackers.name,
      sourceType: projectTrackers.sourceType,
      stage: projectTrackers.stage,
      stageChangedAt: projectTrackers.stageChangedAt,
      kickoffId: projectTrackers.kickoffId,
      createdAt: projectTrackers.createdAt,
      createdBy: projectTrackers.createdBy,
      department: projectKickoffs.department,
    })
    .from(projectTrackers)
    .leftJoin(projectKickoffs, eq(projectTrackers.kickoffId, projectKickoffs.id))
    .orderBy(desc(projectTrackers.createdAt));

  const kickoffIds = trackers.map((t) => t.kickoffId);
  const screeningMap = await loadLatestScreeningsByKickoffIds(kickoffIds);

  return trackers.map((t) => {
    const screening = screeningMap.get(t.kickoffId);
    return {
      id: t.id,
      name: t.name,
      sourceType: t.sourceType,
      stage: t.stage,
      stageChangedAt: coerceSqliteTimestamp(t.stageChangedAt) ?? t.stageChangedAt,
      kickoffId: t.kickoffId,
      createdAt: coerceSqliteTimestamp(t.createdAt) ?? t.createdAt,
      createdBy: t.createdBy,
      department: t.department ?? null,
      screeningStatus: screening?.status ?? null,
      screeningScore: screening?.score ?? null,
      latestScreening: screening ?? null,
    };
  });
}

/** Drizzle `timestamp` mode can inflate ms-stored SQLite defaults into year 50k+. */
function coerceSqliteTimestamp(value: Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value.getUTCFullYear() > 2100) {
    return new Date(value.getTime() / 1000);
  }
  return value;
}

export async function getProjectTrackerById(trackerId: string) {
  const [row] = await db
    .select({
      tracker: projectTrackers,
      kickoff: projectKickoffs,
    })
    .from(projectTrackers)
    .leftJoin(projectKickoffs, eq(projectTrackers.kickoffId, projectKickoffs.id))
    .where(eq(projectTrackers.id, trackerId))
    .limit(1);

  if (!row) return null;

  const screeningMap = row.kickoff
    ? await loadLatestScreeningsByKickoffIds([row.kickoff.id])
    : new Map();

  const latestScreening = row.kickoff
    ? (screeningMap.get(row.kickoff.id) ?? null)
    : null;

  return {
    tracker: row.tracker,
    kickoff: row.kickoff,
    latestScreening,
  };
}
