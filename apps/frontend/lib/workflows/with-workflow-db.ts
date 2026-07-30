import { withDb } from "@repo/db";
import type { WorkflowWorkerEnv } from "@/lib/workflows/workflow-env";

/** Bind D1 for a workflow step: `withDb(env.DB, ...)`. */
export function withWorkflowDb<T>(
  env: WorkflowWorkerEnv,
  fn: () => Promise<T>,
): Promise<T> {
  return withDb(env.DB, fn);
}
