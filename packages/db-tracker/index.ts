import { createDbFromD1 } from "./create-db";
import { isCloudflareWorkersRuntime, workerD1DbAls } from "./d1-context";
import type { AppDb } from "./db-types";

export type { AppDb } from "./db-types";

export { DEPARTMENT_VALUES, Department } from "./enums";
export type { DepartmentValue, ScreenerCategoryValue } from "./enums";

export {
  users,
  accounts,
  sessions,
  verifications,
  screenerTemplates,
  screeners,
  workflowJobs,
  projectKickoffs,
  projectKickoffScreenings,
  projectTrackers,
  epics,
  initiatives,
  initiativeTrackers,
  cycles,
  modules,
  workItems,
  projectStageEvents,
  workLogs,
  workItemComments,
  workItemAssignees,
  workItemEvents,
  views,
} from "./schema";

export type {
  DepartmentValue as SchemaDepartmentValue,
  ProjectStageValue,
  WorkItemStatusValue,
  EpicStatusValue,
  InitiativeStatusValue,
  CycleStatusValue,
  ModuleStatusValue,
  ViewTypeValue,
  User,
  WorkItem,
  ProjectTracker,
  ProjectStageEvent,
  ProjectKickoff,
  ProjectKickoffScreening,
  WorkflowJob,
  Screener,
  Epic,
  Initiative,
  InitiativeTracker,
  Cycle,
  Module,
  WorkLog,
  WorkItemComment,
  View,
  WorkItemAssignee,
  WorkItemEvent,
} from "./schema";

export {
  eq,
  and,
  or,
  sql,
  asc,
  desc,
  inArray,
  count,
  gte,
  lte,
  isNull,
  isNotNull,
  ne,
  gt,
  lt,
  like,
  between,
  notInArray,
} from "drizzle-orm";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export { createDbFromD1 } from "./create-db";
export { isCloudflareWorkersRuntime, workerD1DbAls } from "./d1-context";

const workerDbProxy: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const store = workerD1DbAls.getStore();
    if (!store?.db) {
      throw new Error(
        "@repo/db-tracker: Drizzle `db` was used without an active D1 binding. Run the app with `bun run dev` (remote D1 via Wrangler), or call `runDbWithD1(env.DB, ...)`.",
      );
    }
    return Reflect.get(store.db as object, prop, receiver);
  },
});

const nodeDbProxy: AppDb = new Proxy({} as AppDb, {
  get() {
    throw new Error(
      "@repo/db-tracker: No local database. Use `bun run dev` in apps/project-trackers — dev uses remote D1 on your Cloudflare account.",
    );
  },
});

export const db: AppDb = isCloudflareWorkersRuntime()
  ? workerDbProxy
  : nodeDbProxy;

export async function runDbWithD1<T>(
  d1: D1Database,
  fn: () => Promise<T>,
): Promise<T> {
  const requestDb = createDbFromD1(d1);
  return workerD1DbAls.run({ db: requestDb }, fn);
}

export default db;
