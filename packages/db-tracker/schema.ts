import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  DEPARTMENT_VALUES,
  PROJECT_STAGE_VALUES,
  WORK_ITEM_STATUS_VALUES,
  WORK_ITEM_PRIORITY_VALUES,
  EPIC_STATUS_VALUES,
  INITIATIVE_STATUS_VALUES,
  CYCLE_STATUS_VALUES,
  MODULE_STATUS_VALUES,
  VIEW_TYPE_VALUES,
} from "@repo/enums";
import { SCREENER_CATEGORY_VALUES } from "./enums";

export type DepartmentValue = (typeof DEPARTMENT_VALUES)[number];
export type ProjectStageValue = (typeof PROJECT_STAGE_VALUES)[number];
export type WorkItemStatusValue = (typeof WORK_ITEM_STATUS_VALUES)[number];
export type WorkItemPriorityValue = (typeof WORK_ITEM_PRIORITY_VALUES)[number];
export type ScreenerCategoryValue = (typeof SCREENER_CATEGORY_VALUES)[number];
export type EpicStatusValue = (typeof EPIC_STATUS_VALUES)[number];
export type InitiativeStatusValue =
  (typeof INITIATIVE_STATUS_VALUES)[number];
export type CycleStatusValue = (typeof CYCLE_STATUS_VALUES)[number];
export type ModuleStatusValue = (typeof MODULE_STATUS_VALUES)[number];
export type ViewTypeValue = (typeof VIEW_TYPE_VALUES)[number];

export const users = sqliteTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  role: text("role", { enum: ["USER", "ADMIN"] as const })
    .default("USER")
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  isBlocked: integer("isBlocked", { mode: "boolean" }).default(false).notNull(),
});

export const accounts = sqliteTable("Account", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const sessions = sqliteTable("Session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  token: text("token").unique().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const verifications = sqliteTable("Verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const screenerTemplates = sqliteTable(
  "ScreenerTemplate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    category: text("category", { enum: SCREENER_CATEGORY_VALUES })
      .notNull()
      .default("Project Screener"),
    description: text("description"),
    content: text("content"),
    department: text("department", { enum: DEPARTMENT_VALUES }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    screenerTemplateCategoryIdx: index("screener_template_category_idx").on(
      table.category,
    ),
    screenerTemplateDepartmentIdx: index("screener_template_department_idx").on(
      table.department,
    ),
    screenerTemplateDepartmentUniqueIdx: uniqueIndex(
      "screener_template_department_unique_idx",
    ).on(table.department),
  }),
);

export const screeners = screenerTemplates;

export const workflowJobs = sqliteTable(
  "WorkflowJob",
  {
    instanceId: text("instanceId").primaryKey(),
    workflowKind: text("workflowKind").notNull(),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    dealId: text("dealId"),
    fileName: text("fileName"),
    screenerId: text("screenerId"),
    progressStep: text("progressStep"),
    progressPercent: integer("progressPercent").default(0).notNull(),
    state: text("state").notNull().default("waiting"),
    failedReason: text("failedReason"),
    returnValue: text("returnValue"),
    attemptsMade: integer("attemptsMade").default(0).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => ({
    workflowJobUserCreatedIdx: index("workflow_job_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const projectKickoffs = sqliteTable(
  "ProjectKickoff",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectName: text("projectName").notNull(),
    department: text("department", { enum: DEPARTMENT_VALUES }),
    projectOwners: text("projectOwners"),
    productDirection: text("productDirection"),
    engineeringLead: text("engineeringLead"),
    objectives: text("objectives").notNull(),
    platformEnables: text("platformEnables"),
    keyDeliverables: text("keyDeliverables"),
    risksAndBlockers: text("risksAndBlockers"),
    raciMatrix: text("raciMatrix"),
    timeline: text("timeline"),
    chosenTool: text("chosenTool"),
    techStack: text("techStack"),
    definitionOfDone: text("definitionOfDone"),
    additionalNotes: text("additionalNotes"),
    rawText: text("rawText"),
    structuredData: text("structuredData"),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectKickoffUserCreatedIdx: index("project_kickoff_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const projectKickoffScreenings = sqliteTable(
  "ProjectKickoffScreening",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    kickoffId: text("kickoffId")
      .notNull()
      .references(() => projectKickoffs.id, { onDelete: "cascade" }),
    workflowInstanceId: text("workflowInstanceId").references(
      () => workflowJobs.instanceId,
      { onDelete: "set null" },
    ),
    status: text("status", {
      enum: ["pending", "running", "completed", "failed"] as const,
    })
      .notNull()
      .default("pending"),
    score: real("score"),
    analysis: text("analysis"),
    screenedAt: integer("screenedAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectKickoffScreeningKickoffCreatedIdx: index(
      "project_kickoff_screening_kickoff_created_idx",
    ).on(table.kickoffId, table.createdAt),
    projectKickoffScreeningWorkflowUniqueIdx: uniqueIndex(
      "project_kickoff_screening_workflow_unique_idx",
    ).on(table.workflowInstanceId),
  }),
);

export const projectTrackers = sqliteTable(
  "ProjectTracker",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    sourceType: text("sourceType", { enum: ["PROJECT_KICKOFF"] as const })
      .notNull()
      .default("PROJECT_KICKOFF"),
    stage: text("stage", { enum: PROJECT_STAGE_VALUES })
      .notNull()
      .default("KICKOFF"),
    stageChangedAt: integer("stageChangedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    kickoffId: text("kickoffId")
      .notNull()
      .references(() => projectKickoffs.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    createdBy: text("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    projectTrackerKickoffUniqueIdx: uniqueIndex(
      "project_tracker_kickoff_unique_idx",
    ).on(table.kickoffId),
    projectTrackerStageIdx: index("project_tracker_stage_idx").on(table.stage),
  }),
);

export const epics = sqliteTable(
  "Epic",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: EPIC_STATUS_VALUES })
      .notNull()
      .default("ACTIVE"),
    startDate: integer("startDate", { mode: "timestamp" }),
    dueDate: integer("dueDate", { mode: "timestamp" }),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdBy: text("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    epicTrackerIdx: index("epic_tracker_idx").on(table.trackerId),
  }),
);

export const initiatives = sqliteTable(
  "Initiative",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: INITIATIVE_STATUS_VALUES })
      .notNull()
      .default("ACTIVE"),
    startDate: integer("startDate", { mode: "timestamp" }),
    targetDate: integer("targetDate", { mode: "timestamp" }),
    color: text("color"),
    createdBy: text("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
);

export const initiativeTrackers = sqliteTable(
  "InitiativeTracker",
  {
    initiativeId: text("initiativeId")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    addedAt: integer("addedAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.initiativeId, table.trackerId] }),
  }),
);

export const cycles = sqliteTable(
  "Cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    startDate: integer("startDate", { mode: "timestamp" }).notNull(),
    endDate: integer("endDate", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: CYCLE_STATUS_VALUES })
      .notNull()
      .default("UPCOMING"),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdBy: text("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    cycleTrackerIdx: index("cycle_tracker_idx").on(table.trackerId),
    cycleStatusIdx: index("cycle_status_idx").on(table.status),
  }),
);

export const modules = sqliteTable(
  "Module",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: MODULE_STATUS_VALUES })
      .notNull()
      .default("ACTIVE"),
    leadUserId: text("leadUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    moduleTrackerIdx: index("module_tracker_idx").on(table.trackerId),
  }),
);

export const workItems = sqliteTable(
  "WorkItem",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    epicId: text("epicId").references(() => epics.id, {
      onDelete: "set null",
    }),
    cycleId: text("cycleId").references(() => cycles.id, {
      onDelete: "set null",
    }),
    moduleId: text("moduleId").references(() => modules.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: WORK_ITEM_STATUS_VALUES })
      .notNull()
      .default("TODO"),
    priority: text("priority", { enum: WORK_ITEM_PRIORITY_VALUES })
      .notNull()
      .default("NONE"),
    startDate: integer("startDate", { mode: "timestamp" }),
    dueDate: integer("dueDate", { mode: "timestamp" }),
    estimatePoints: integer("estimatePoints"),
    estimateHours: real("estimateHours"),
    tags: text("tags").notNull().default("[]"),
    sequence: integer("sequence"),
    createdBy: text("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workItemTrackerCreatedIdx: index("work_item_tracker_created_idx").on(
      table.trackerId,
      table.createdAt,
    ),
    workItemTrackerStatusIdx: index("work_item_tracker_status_idx").on(
      table.trackerId,
      table.status,
    ),
    workItemEpicIdx: index("work_item_epic_idx").on(table.epicId),
    workItemCycleIdx: index("work_item_cycle_idx").on(table.cycleId),
    workItemModuleIdx: index("work_item_module_idx").on(table.moduleId),
  }),
);

export const projectStageEvents = sqliteTable(
  "ProjectStageEvent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    fromStage: text("fromStage", { enum: PROJECT_STAGE_VALUES }),
    toStage: text("toStage", { enum: PROJECT_STAGE_VALUES }).notNull(),
    changedBy: text("changedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => ({
    projectStageEventTrackerCreatedIdx: index(
      "project_stage_event_tracker_created_idx",
    ).on(table.trackerId, table.createdAt),
  }),
);

export const workLogs = sqliteTable(
  "WorkLog",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workItemId: text("workItemId")
      .notNull()
      .references(() => workItems.id, { onDelete: "cascade" }),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    hours: real("hours").notNull(),
    description: text("description").notNull().default(""),
    loggedAt: integer("loggedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workLogWorkItemIdx: index("work_log_work_item_idx").on(table.workItemId),
    workLogUserIdIdx: index("work_log_user_id_idx").on(table.userId),
  }),
);

export const workItemComments = sqliteTable(
  "WorkItemComment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workItemId: text("workItemId")
      .notNull()
      .references(() => workItems.id, { onDelete: "cascade" }),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    parentCommentId: text("parentCommentId").references(
      (): any => workItemComments.id,
      { onDelete: "cascade" },
    ),
    content: text("content").notNull().default(""),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workItemCommentWorkItemIdx: index("work_item_comment_work_item_idx").on(
      table.workItemId,
      table.createdAt,
    ),
    workItemCommentParentIdx: index("work_item_comment_parent_idx").on(
      table.parentCommentId,
    ),
  }),
);

export const workItemAssignees = sqliteTable(
  "WorkItemAssignee",
  {
    workItemId: text("workItemId")
      .notNull()
      .references(() => workItems.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: integer("assignedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workItemId, table.userId] }),
    workItemAssigneeUserIdx: index("work_item_assignee_user_idx").on(
      table.userId,
    ),
  }),
);

export const moduleMembers = sqliteTable(
  "ModuleMember",
  {
    moduleId: text("moduleId")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addedAt: integer("addedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.moduleId, table.userId] }),
    moduleMemberUserIdx: index("module_member_user_idx").on(table.userId),
  }),
);

export const workItemEvents = sqliteTable(
  "WorkItemEvent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workItemId: text("workItemId")
      .notNull()
      .references(() => workItems.id, { onDelete: "cascade" }),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workItemEventItemIdx: index("work_item_event_item_idx").on(
      table.workItemId,
      table.createdAt,
    ),
  }),
);

export const views = sqliteTable(
  "View",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    trackerId: text("trackerId")
      .notNull()
      .references(() => projectTrackers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: VIEW_TYPE_VALUES }).notNull(),
    filters: text("filters").notNull().default("{}"),
    sortConfig: text("sortConfig").notNull().default("{}"),
    groupBy: text("groupBy"),
    displayProps: text("displayProps").notNull().default("{}"),
    isDefault: integer("isDefault", { mode: "boolean" }).default(false).notNull(),
    createdBy: text("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("createdAt", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    viewTrackerIdx: index("view_tracker_idx").on(table.trackerId),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  projectKickoffs: many(projectKickoffs),
}));

export const projectKickoffsRelations = relations(
  projectKickoffs,
  ({ one, many }) => ({
    user: one(users, {
      fields: [projectKickoffs.userId],
      references: [users.id],
    }),
    tracker: one(projectTrackers, {
      fields: [projectKickoffs.id],
      references: [projectTrackers.kickoffId],
    }),
    screenings: many(projectKickoffScreenings),
  }),
);

export const projectTrackersRelations = relations(
  projectTrackers,
  ({ one, many }) => ({
    kickoff: one(projectKickoffs, {
      fields: [projectTrackers.kickoffId],
      references: [projectKickoffs.id],
    }),
    createdByUser: one(users, {
      fields: [projectTrackers.createdBy],
      references: [users.id],
    }),
    stageEvents: many(projectStageEvents),
    workItems: many(workItems),
    epics: many(epics),
    cycles: many(cycles),
    modules: many(modules),
    views: many(views),
    initiativeTrackers: many(initiativeTrackers),
  }),
);

export const workItemsRelations = relations(workItems, ({ one, many }) => ({
  tracker: one(projectTrackers, {
    fields: [workItems.trackerId],
    references: [projectTrackers.id],
  }),
  epic: one(epics, {
    fields: [workItems.epicId],
    references: [epics.id],
  }),
  cycle: one(cycles, {
    fields: [workItems.cycleId],
    references: [cycles.id],
  }),
  module: one(modules, {
    fields: [workItems.moduleId],
    references: [modules.id],
  }),
  createdByUser: one(users, {
    fields: [workItems.createdBy],
    references: [users.id],
  }),
  workLogs: many(workLogs),
  comments: many(workItemComments),
  assignees: many(workItemAssignees),
  events: many(workItemEvents),
}));

export const projectStageEventsRelations = relations(
  projectStageEvents,
  ({ one }) => ({
    tracker: one(projectTrackers, {
      fields: [projectStageEvents.trackerId],
      references: [projectTrackers.id],
    }),
    changedByUser: one(users, {
      fields: [projectStageEvents.changedBy],
      references: [users.id],
    }),
  }),
);

export const projectKickoffScreeningsRelations = relations(
  projectKickoffScreenings,
  ({ one }) => ({
    kickoff: one(projectKickoffs, {
      fields: [projectKickoffScreenings.kickoffId],
      references: [projectKickoffs.id],
    }),
    workflowJob: one(workflowJobs, {
      fields: [projectKickoffScreenings.workflowInstanceId],
      references: [workflowJobs.instanceId],
    }),
  }),
);

export const epicsRelations = relations(epics, ({ one, many }) => ({
  tracker: one(projectTrackers, {
    fields: [epics.trackerId],
    references: [projectTrackers.id],
  }),
  createdByUser: one(users, {
    fields: [epics.createdBy],
    references: [users.id],
  }),
  workItems: many(workItems),
}));

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [initiatives.createdBy],
    references: [users.id],
  }),
  initiativeTrackers: many(initiativeTrackers),
}));

export const initiativeTrackersRelations = relations(
  initiativeTrackers,
  ({ one }) => ({
    initiative: one(initiatives, {
      fields: [initiativeTrackers.initiativeId],
      references: [initiatives.id],
    }),
    tracker: one(projectTrackers, {
      fields: [initiativeTrackers.trackerId],
      references: [projectTrackers.id],
    }),
  }),
);

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  tracker: one(projectTrackers, {
    fields: [cycles.trackerId],
    references: [projectTrackers.id],
  }),
  createdByUser: one(users, {
    fields: [cycles.createdBy],
    references: [users.id],
  }),
  workItems: many(workItems),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  tracker: one(projectTrackers, {
    fields: [modules.trackerId],
    references: [projectTrackers.id],
  }),
  leadUser: one(users, {
    fields: [modules.leadUserId],
    references: [users.id],
  }),
  workItems: many(workItems),
  members: many(moduleMembers),
}));

export const moduleMembersRelations = relations(moduleMembers, ({ one }) => ({
  module: one(modules, {
    fields: [moduleMembers.moduleId],
    references: [modules.id],
  }),
  user: one(users, {
    fields: [moduleMembers.userId],
    references: [users.id],
  }),
}));

export const workLogsRelations = relations(workLogs, ({ one }) => ({
  workItem: one(workItems, {
    fields: [workLogs.workItemId],
    references: [workItems.id],
  }),
  user: one(users, {
    fields: [workLogs.userId],
    references: [users.id],
  }),
}));

export const workItemCommentsRelations = relations(
  workItemComments,
  ({ one, many }) => ({
    workItem: one(workItems, {
      fields: [workItemComments.workItemId],
      references: [workItems.id],
    }),
    user: one(users, {
      fields: [workItemComments.userId],
      references: [users.id],
    }),
    parentComment: one(workItemComments, {
      fields: [workItemComments.parentCommentId],
      references: [workItemComments.id],
    }),
    replies: many(workItemComments),
  }),
);

export const viewsRelations = relations(views, ({ one }) => ({
  tracker: one(projectTrackers, {
    fields: [views.trackerId],
    references: [projectTrackers.id],
  }),
  createdByUser: one(users, {
    fields: [views.createdBy],
    references: [users.id],
  }),
}));

export const workItemAssigneesRelations = relations(
  workItemAssignees,
  ({ one }) => ({
    workItem: one(workItems, {
      fields: [workItemAssignees.workItemId],
      references: [workItems.id],
    }),
    user: one(users, {
      fields: [workItemAssignees.userId],
      references: [users.id],
    }),
  }),
);

export const workItemEventsRelations = relations(
  workItemEvents,
  ({ one }) => ({
    workItem: one(workItems, {
      fields: [workItemEvents.workItemId],
      references: [workItems.id],
    }),
    user: one(users, {
      fields: [workItemEvents.userId],
      references: [users.id],
    }),
  }),
);

export type User = typeof users.$inferSelect;
export type WorkItem = typeof workItems.$inferSelect;
export type ProjectTracker = typeof projectTrackers.$inferSelect;
export type ProjectStageEvent = typeof projectStageEvents.$inferSelect;
export type ProjectKickoff = typeof projectKickoffs.$inferSelect;
export type ProjectKickoffScreening = typeof projectKickoffScreenings.$inferSelect;
export type WorkflowJob = typeof workflowJobs.$inferSelect;
export type Screener = typeof screeners.$inferSelect;
export type Epic = typeof epics.$inferSelect;
export type Initiative = typeof initiatives.$inferSelect;
export type InitiativeTracker = typeof initiativeTrackers.$inferSelect;
export type Cycle = typeof cycles.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type WorkLog = typeof workLogs.$inferSelect;
export type WorkItemComment = typeof workItemComments.$inferSelect;
export type View = typeof views.$inferSelect;
export type WorkItemAssignee = typeof workItemAssignees.$inferSelect;
export type ModuleMember = typeof moduleMembers.$inferSelect;
export type WorkItemEvent = typeof workItemEvents.$inferSelect;
