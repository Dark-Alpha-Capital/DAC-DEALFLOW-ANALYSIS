import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { icScorerRuns } from "../schema";

export async function listIcScorerRunsForDealOpportunity(
  dealOpportunityId: string,
  limit = 30,
) {
  return db
    .select()
    .from(icScorerRuns)
    .where(eq(icScorerRuns.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(icScorerRuns.createdAt))
    .limit(limit);
}

export async function getIcScorerRunById(runId: string) {
  const [row] = await db
    .select()
    .from(icScorerRuns)
    .where(eq(icScorerRuns.id, runId))
    .limit(1);
  return row ?? null;
}

export async function getIcScorerRunByIdForDeal(
  runId: string,
  dealOpportunityId: string,
) {
  const [row] = await db
    .select()
    .from(icScorerRuns)
    .where(
      and(
        eq(icScorerRuns.id, runId),
        eq(icScorerRuns.dealOpportunityId, dealOpportunityId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function icScorerRunHasActiveStatus(dealOpportunityId: string) {
  const rows = await db
    .select({ id: icScorerRuns.id })
    .from(icScorerRuns)
    .where(
      and(
        eq(icScorerRuns.dealOpportunityId, dealOpportunityId),
        inArray(icScorerRuns.status, ["PENDING", "SCORING", "MEMO"]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
