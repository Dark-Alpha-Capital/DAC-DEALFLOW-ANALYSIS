import { runDbWithD1 } from "@repo/db";
import type { WorkflowWorkerEnv } from "./workflow-env";

export function withWorkflowDb<T>(
  env: WorkflowWorkerEnv,
  fn: () => Promise<T>,
): Promise<T> {
  return runDbWithD1(env.DB, fn);
}
