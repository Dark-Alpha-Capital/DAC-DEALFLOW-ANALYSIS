import { createTRPCRouter, protectedProcedure } from "../init";
import { eq, and, lte, count, desc } from "@repo/db-tracker";
import {
  projectTrackers,
  projectKickoffs,
  workItems,
  projectKickoffScreenings,
  projectStageEvents,
} from "@repo/db-tracker/schema";
import { db } from "@repo/db-tracker";

export const analyticsRouter = createTRPCRouter({
  overview: protectedProcedure.query(async () => {
    const now = new Date();

    const archivedResult = await db
      .select({ count: count() })
      .from(projectTrackers)
      .where(eq(projectTrackers.stage, "ARCHIVED"));
    const archivedCount = archivedResult.length > 0 ? archivedResult[0].count : 0;

    const totalResult = await db
      .select({ count: count() })
      .from(projectTrackers);
    const totalTrackers = totalResult.length > 0 ? totalResult[0].count : 0;

    const wiTotal = await db
      .select({ count: count() })
      .from(workItems);
    const totalWorkItems = wiTotal.length > 0 ? wiTotal[0].count : 0;

    const wiDone = await db
      .select({ count: count() })
      .from(workItems)
      .where(eq(workItems.status, "DONE"));
    const completedWorkItems = wiDone.length > 0 ? wiDone[0].count : 0;

    const wiOverdue = await db
      .select({ count: count() })
      .from(workItems)
      .where(
        and(
          eq(workItems.status, "TODO"),
          lte(workItems.dueDate, now),
        ),
      );
    const overdueWorkItems = wiOverdue.length > 0 ? wiOverdue[0].count : 0;

    const screenings = await db
      .select({ score: projectKickoffScreenings.score })
      .from(projectKickoffScreenings)
      .where(eq(projectKickoffScreenings.status, "completed"));

    const validScores = screenings.filter(
      (s): s is { score: number } => s.score != null,
    );
    const avgScreeningScore =
      validScores.length > 0
        ? validScores.reduce((s, r) => s + r.score, 0) / validScores.length
        : null;

    return {
      activeProjects: totalTrackers - archivedCount,
      totalWorkItems,
      completedWorkItems,
      overdueWorkItems,
      avgScreeningScore: avgScreeningScore
        ? Math.round(avgScreeningScore * 100) / 100
        : null,
    };
  }),

  projectsByStage: protectedProcedure.query(async () => {
    const rows = await db
      .select({ stage: projectTrackers.stage, count: count() })
      .from(projectTrackers)
      .groupBy(projectTrackers.stage);
    return rows.map((r) => ({ stage: r.stage, count: r.count }));
  }),

  projectsByDepartment: protectedProcedure.query(async () => {
    const rows = await db
      .select({ department: projectKickoffs.department, count: count() })
      .from(projectTrackers)
      .leftJoin(projectKickoffs, eq(projectTrackers.kickoffId, projectKickoffs.id))
      .groupBy(projectKickoffs.department);
    return rows
      .filter((r) => r.department != null)
      .map((r) => ({ department: r.department!, count: r.count }));
  }),

  workItemsByStatus: protectedProcedure.query(async () => {
    const rows = await db
      .select({ status: workItems.status, count: count() })
      .from(workItems)
      .groupBy(workItems.status);
    return rows.map((r) => ({ status: r.status, count: r.count }));
  }),

  screeningScoreDistribution: protectedProcedure.query(async () => {
    const rows = await db
      .select({ score: projectKickoffScreenings.score })
      .from(projectKickoffScreenings)
      .where(eq(projectKickoffScreenings.status, "completed"));

    const valid = rows.filter(
      (r): r is { score: number } => r.score != null,
    );

    const buckets: Record<string, number> = {
      "0-1": 0, "1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0,
    };

    for (const { score } of valid) {
      if (score < 1) buckets["0-1"]++;
      else if (score < 2) buckets["1-2"]++;
      else if (score < 3) buckets["2-3"]++;
      else if (score < 4) buckets["3-4"]++;
      else buckets["4-5"]++;
    }

    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }),

  topTrackersByWorkItems: protectedProcedure.query(async () => {
    const rows = await db
      .select({ trackerId: workItems.trackerId, count: count() })
      .from(workItems)
      .groupBy(workItems.trackerId)
      .orderBy(desc(count()))
      .limit(10);

    const trackers = await Promise.all(
      rows.map(async (r) => {
        const result = await db
          .select({ name: projectTrackers.name, stage: projectTrackers.stage })
          .from(projectTrackers)
          .where(eq(projectTrackers.id, r.trackerId))
          .limit(1);
        return result[0] ?? null;
      }),
    );

    return rows.map((r, i) => ({
      trackerId: r.trackerId,
      name: trackers[i]?.name ?? "Unknown",
      stage: trackers[i]?.stage ?? null,
      workItemCount: r.count,
    }));
  }),

  recentActivity: protectedProcedure.query(async () => {
    const events = await db
      .select({
        id: projectStageEvents.id,
        trackerId: projectStageEvents.trackerId,
        fromStage: projectStageEvents.fromStage,
        toStage: projectStageEvents.toStage,
        note: projectStageEvents.note,
        createdAt: projectStageEvents.createdAt,
      })
      .from(projectStageEvents)
      .orderBy(desc(projectStageEvents.createdAt))
      .limit(20);

    return events.map((e) => ({
      type: "stage_change" as const,
      id: e.id,
      trackerId: e.trackerId,
      from: e.fromStage,
      to: e.toStage,
      note: e.note,
      createdAt: e.createdAt,
    }));
  }),
});
