import { eq } from "drizzle-orm";
import { db } from "../index";
import {
  icScorerRuns,
  type IcScorerRun,
  type NewIcScorerRun,
} from "../schema";

export async function insertIcScorerRun(
  row: Omit<NewIcScorerRun, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
) {
  const [inserted] = await db.insert(icScorerRuns).values(row).returning();
  return inserted ?? null;
}

type IcScorerRunPatch = Partial<
  Pick<
    IcScorerRun,
    | "status"
    | "errorMessage"
    | "scorePayload"
    | "output"
    | "memoWorkflowInstanceId"
    | "scoreWorkflowInstanceId"
    | "evidenceChunkIds"
    | "promptVersion"
    | "dealDocumentsSnapshot"
  >
>;

export async function updateIcScorerRun(runId: string, patch: IcScorerRunPatch) {
  const [row] = await db
    .update(icScorerRuns)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(icScorerRuns.id, runId))
    .returning();
  return row ?? null;
}
