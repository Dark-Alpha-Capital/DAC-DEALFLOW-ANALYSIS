import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { SCREENER_CATEGORY_VALUES } from "./enums";

export type DepartmentValue = (typeof DEPARTMENT_VALUES)[number];
export type ScreenerCategoryValue = (typeof SCREENER_CATEGORY_VALUES)[number];

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
  ({ one }) => ({
    kickoff: one(projectKickoffs, {
      fields: [projectTrackers.kickoffId],
      references: [projectKickoffs.id],
    }),
    createdByUser: one(users, {
      fields: [projectTrackers.createdBy],
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

export type User = typeof users.$inferSelect;
export type ProjectTracker = typeof projectTrackers.$inferSelect;
export type ProjectKickoff = typeof projectKickoffs.$inferSelect;
export type ProjectKickoffScreening = typeof projectKickoffScreenings.$inferSelect;
export type WorkflowJob = typeof workflowJobs.$inferSelect;
export type Screener = typeof screeners.$inferSelect;
