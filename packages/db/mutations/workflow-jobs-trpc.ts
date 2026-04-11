import { db } from "..";
import { workflowJobs } from "../schema";
import { eq } from "drizzle-orm";

export async function resetWorkflowJobRowAfterRestart(instanceId: string) {
  await db
    .update(workflowJobs)
    .set({
      state: "waiting",
      failedReason: null,
      returnValue: null,
      progressPercent: 0,
      progressStep: null,
      updatedAt: new Date(),
    })
    .where(eq(workflowJobs.instanceId, instanceId));
}
