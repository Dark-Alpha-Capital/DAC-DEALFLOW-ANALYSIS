import {
  pgTable,
  text,
  timestamp,
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum("UserRole", ["USER", "ADMIN"]);

export const dealStatusEnum = pgEnum("DealStatus", [
  "AVAILABLE",
  "SOLD",
  "UNDER_CONTRACT",
  "NOT_SPECIFIED",
]);

export const dealDocumentCategoryEnum = pgEnum("DealDocumentCategory", [
  "LEGAL",
  "DOCUMENTATION",
  "MARKETING",
  "INVESTOR_RELATIONSHIPS",
  "TECHNICAL",
  "TOOLS",
  "LEGISLATION",
  "RESEARCH",
  "PROSPECTUS",
  "FINANCIALS",
  "OTHER",
]);

export const dealTypeEnum = pgEnum("DealType", [
  "SCRAPED",
  "MANUAL",
  "AI_INFERRED",
]);

export const sentimentEnum = pgEnum("Sentiment", [
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
]);

export const companyStageEnum = pgEnum("CompanyStage", [
  "STARTUP",
  "GROWTH",
  "MATURE",
  "TURNAROUND",
  "DISTRESSED",
]);

export const fileCategoryEnum = pgEnum("FileCategory", [
  "FINANCIALS",
  "LEGAL",
  "TAX",
  "TECHNICAL",
  "COMMERCIAL",
  "ESG",
  "MARKETING",
  "OPERATIONS",
  "OTHER",
]);

export const dueDiligenceSectionTypeEnum = pgEnum("DueDiligenceSectionType", [
  "FINANCIAL",
  "LEGAL",
  "TAX",
  "TECHNICAL",
  "COMMERCIAL",
  "ESG",
  "OPERATIONAL",
  "MARKET",
  "MANAGEMENT",
]);

export const sectionStatusEnum = pgEnum("SectionStatus", [
  "PENDING",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
]);

export const taskStatusEnum = pgEnum("TaskStatus", [
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const riskLevelEnum = pgEnum("RiskLevel", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

// ============================================================================
// TABLES
// ============================================================================

// User table
export const users = pgTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("USER").notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  isBlocked: boolean("isBlocked").default(false).notNull(),
});

// Account table (for OAuth)
export const accounts = pgTable("Account", {
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
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Session table
export const sessions = pgTable("Session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  token: text("token").unique().notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Verification table
export const verifications = pgTable("Verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Rollup table (defined before Deal due to reference)
export const rollups = pgTable("Rollup", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  summary: text("summary"),
});

// Deal table
export const deals = pgTable("Deal", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  brokerage: text("brokerage").notNull(),
  firstName: text("firstName"),
  lastName: text("lastName"),
  linkedinUrl: text("linkedinUrl"),
  workPhone: text("workPhone"),
  dealCaption: text("dealCaption").notNull(),
  revenue: doublePrecision("revenue").notNull(),
  ebitda: doublePrecision("ebitda").notNull(),
  title: text("title"),
  grossRevenue: doublePrecision("grossRevenue"),
  askingPrice: doublePrecision("askingPrice"),
  ebitdaMargin: doublePrecision("ebitdaMargin").notNull(),
  industry: text("industry").notNull(),
  dealType: dealTypeEnum("dealType").default("MANUAL").notNull(),
  sourceWebsite: text("sourceWebsite").notNull(),
  companyLocation: text("companyLocation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  email: text("email"),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  bitrixCreatedAt: timestamp("bitrixCreatedAt"),
  bitrixId: text("bitrixId"),
  userId: text("userId").references(() => users.id),
  dealTeaser: text("dealTeaser"),
  tags: text("tags").array().default([]),
  bitrixLink: text("bitrixLink"),
  isPublished: boolean("isPublished").default(false).notNull(),
  isReviewed: boolean("isReviewed").default(false).notNull(),
  status: dealStatusEnum("status").default("NOT_SPECIFIED").notNull(),
  seen: boolean("seen").default(false).notNull(),
  chunk_text: text("chunk_text"),
  description: text("description"),
  rollupId: text("rollupId").references(() => rollups.id),
});

// DealDocument table
export const dealDocuments = pgTable("DealDocument", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  dealId: text("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  caption: text("caption"),
  category: dealDocumentCategoryEnum("category").default("OTHER").notNull(),
  documentUrl: text("documentUrl").notNull(),
  fileName: text("fileName"),
  fileType: text("fileType"),
  tags: text("tags").array().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// POC table
export const pocs = pgTable("POC", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  workPhone: text("workPhone"),
  email: text("email").notNull(),
  dealId: text("dealId").references(() => deals.id, { onDelete: "cascade" }),
});

// Questionnaire table
export const questionnaires = pgTable("questionnaires", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  fileUrl: text("fileUrl").notNull(),
  title: text("title").notNull(),
  purpose: text("purpose").notNull(),
  author: text("author").notNull(),
  version: text("version").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Screener table
export const screeners = pgTable("Screener", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  content: text("content").notNull(),
  fileUrl: text("fileUrl").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

// AiScreening table
export const aiScreenings = pgTable("AiScreening", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  dealId: text("dealId")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  sentiment: sentimentEnum("sentiment").default("NEUTRAL").notNull(),
  content: text("content"),
  score: integer("score"),
  screenerId: text("screenerId").references(() => screeners.id, {
    onDelete: "cascade",
  }),
});

// UserActionLog table
export const userActionLogs = pgTable("UserActionLog", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("userId")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Employee table
export const employees = pgTable("Employee", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  dealId: text("dealId").references(() => deals.id),
});

// Company table
export const companies = pgTable("Company", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  website: text("website"),
  sector: text("sector"),
  stage: companyStageEnum("stage"),
  headquarters: text("headquarters"),
  description: text("description"),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  ebitda: decimal("ebitda", { precision: 10, scale: 2 }),
  growthRate: decimal("growthRate", { precision: 10, scale: 2 }),
  employees: integer("employees").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Founder table
export const founders = pgTable("Founder", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  linkedin: text("linkedin"),
  companyId: text("companyId")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// File table
export const files = pgTable("File", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  category: fileCategoryEnum("category").notNull(),
  tags: text("tags").array().default([]),
  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize"),
  mimeType: text("mimeType"),
  version: text("version").default("1.0").notNull(),
  isLatest: boolean("isLatest").default(true).notNull(),
  companyId: text("companyId")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  uploadedById: text("uploadedById")
    .notNull()
    .references(() => users.id),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// DueDiligenceSection table
export const dueDiligenceSections = pgTable("DueDiligenceSection", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  type: dueDiligenceSectionTypeEnum("type").notNull(),
  status: sectionStatusEnum("status").default("PENDING").notNull(),
  notes: text("notes"),
  findings: text("findings"),
  companyId: text("companyId")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Review table
export const reviews = pgTable("Review", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  riskLevel: riskLevelEnum("riskLevel").default("MEDIUM").notNull(),
  confidence: integer("confidence"),
  companyId: text("companyId")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  sectionId: text("sectionId").references(() => dueDiligenceSections.id, {
    onDelete: "cascade",
  }),
  reviewerId: text("reviewerId")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Task table
export const tasks = pgTable("Task", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("ASSIGNED").notNull(),
  priority: integer("priority").default(3),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  companyId: text("companyId")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  sectionId: text("sectionId").references(() => dueDiligenceSections.id, {
    onDelete: "cascade",
  }),
  assignedToId: text("assignedToId")
    .notNull()
    .references(() => users.id),
  createdById: text("createdById")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// Many-to-many: User <-> Rollup (UserRollups)
export const usersToRollups = pgTable("_UserRollups", {
  A: text("A")
    .notNull()
    .references(() => rollups.id, { onDelete: "cascade" }),
  B: text("B")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  deals: many(deals),
  files: many(files),
  reviews: many(reviews),
  assignedTasks: many(tasks, { relationName: "TaskAssignee" }),
  createdTasks: many(tasks, { relationName: "TaskCreator" }),
  userActionLogs: many(userActionLogs),
  rollups: many(usersToRollups),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const rollupsRelations = relations(rollups, ({ many }) => ({
  deals: many(deals),
  users: many(usersToRollups),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
  rollup: one(rollups, {
    fields: [deals.rollupId],
    references: [rollups.id],
  }),
  aiScreenings: many(aiScreenings),
  dealDocuments: many(dealDocuments),
  employees: many(employees),
  pocs: many(pocs),
}));

export const dealDocumentsRelations = relations(dealDocuments, ({ one }) => ({
  deal: one(deals, {
    fields: [dealDocuments.dealId],
    references: [deals.id],
  }),
}));

export const pocsRelations = relations(pocs, ({ one }) => ({
  deal: one(deals, {
    fields: [pocs.dealId],
    references: [deals.id],
  }),
}));

export const screenersRelations = relations(screeners, ({ many }) => ({
  aiScreenings: many(aiScreenings),
}));

export const aiScreeningsRelations = relations(aiScreenings, ({ one }) => ({
  deal: one(deals, {
    fields: [aiScreenings.dealId],
    references: [deals.id],
  }),
  screener: one(screeners, {
    fields: [aiScreenings.screenerId],
    references: [screeners.id],
  }),
}));

export const userActionLogsRelations = relations(userActionLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActionLogs.userId],
    references: [users.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  deal: one(deals, {
    fields: [employees.dealId],
    references: [deals.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  founders: many(founders),
  files: many(files),
  sections: many(dueDiligenceSections),
  reviews: many(reviews),
  tasks: many(tasks),
}));

export const foundersRelations = relations(founders, ({ one }) => ({
  company: one(companies, {
    fields: [founders.companyId],
    references: [companies.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  company: one(companies, {
    fields: [files.companyId],
    references: [companies.id],
  }),
  uploadedBy: one(users, {
    fields: [files.uploadedById],
    references: [users.id],
  }),
}));

export const dueDiligenceSectionsRelations = relations(
  dueDiligenceSections,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [dueDiligenceSections.companyId],
      references: [companies.id],
    }),
    reviews: many(reviews),
    tasks: many(tasks),
  })
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  company: one(companies, {
    fields: [reviews.companyId],
    references: [companies.id],
  }),
  section: one(dueDiligenceSections, {
    fields: [reviews.sectionId],
    references: [dueDiligenceSections.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  company: one(companies, {
    fields: [tasks.companyId],
    references: [companies.id],
  }),
  section: one(dueDiligenceSections, {
    fields: [tasks.sectionId],
    references: [dueDiligenceSections.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "TaskAssignee",
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "TaskCreator",
  }),
}));

export const usersToRollupsRelations = relations(usersToRollups, ({ one }) => ({
  rollup: one(rollups, {
    fields: [usersToRollups.A],
    references: [rollups.id],
  }),
  user: one(users, {
    fields: [usersToRollups.B],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Enum value exports
export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DealStatus = {
  AVAILABLE: "AVAILABLE",
  SOLD: "SOLD",
  UNDER_CONTRACT: "UNDER_CONTRACT",
  NOT_SPECIFIED: "NOT_SPECIFIED",
} as const;
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

export const DealDocumentCategory = {
  LEGAL: "LEGAL",
  DOCUMENTATION: "DOCUMENTATION",
  MARKETING: "MARKETING",
  INVESTOR_RELATIONSHIPS: "INVESTOR_RELATIONSHIPS",
  TECHNICAL: "TECHNICAL",
  TOOLS: "TOOLS",
  LEGISLATION: "LEGISLATION",
  RESEARCH: "RESEARCH",
  PROSPECTUS: "PROSPECTUS",
  FINANCIALS: "FINANCIALS",
  OTHER: "OTHER",
} as const;
export type DealDocumentCategory =
  (typeof DealDocumentCategory)[keyof typeof DealDocumentCategory];

export const DealType = {
  SCRAPED: "SCRAPED",
  MANUAL: "MANUAL",
  AI_INFERRED: "AI_INFERRED",
} as const;
export type DealType = (typeof DealType)[keyof typeof DealType];

export const Sentiment = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
} as const;
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];

export const CompanyStage = {
  STARTUP: "STARTUP",
  GROWTH: "GROWTH",
  MATURE: "MATURE",
  TURNAROUND: "TURNAROUND",
  DISTRESSED: "DISTRESSED",
} as const;
export type CompanyStage = (typeof CompanyStage)[keyof typeof CompanyStage];

export const FileCategory = {
  FINANCIALS: "FINANCIALS",
  LEGAL: "LEGAL",
  TAX: "TAX",
  TECHNICAL: "TECHNICAL",
  COMMERCIAL: "COMMERCIAL",
  ESG: "ESG",
  MARKETING: "MARKETING",
  OPERATIONS: "OPERATIONS",
  OTHER: "OTHER",
} as const;
export type FileCategory = (typeof FileCategory)[keyof typeof FileCategory];

export const DueDiligenceSectionType = {
  FINANCIAL: "FINANCIAL",
  LEGAL: "LEGAL",
  TAX: "TAX",
  TECHNICAL: "TECHNICAL",
  COMMERCIAL: "COMMERCIAL",
  ESG: "ESG",
  OPERATIONAL: "OPERATIONAL",
  MARKET: "MARKET",
  MANAGEMENT: "MANAGEMENT",
} as const;
export type DueDiligenceSectionType =
  (typeof DueDiligenceSectionType)[keyof typeof DueDiligenceSectionType];

export const SectionStatus = {
  PENDING: "PENDING",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
  BLOCKED: "BLOCKED",
} as const;
export type SectionStatus = (typeof SectionStatus)[keyof typeof SectionStatus];

export const TaskStatus = {
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const RiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

// Model type exports (inferred from tables)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type Rollup = typeof rollups.$inferSelect;
export type NewRollup = typeof rollups.$inferInsert;

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;

export type DealDocument = typeof dealDocuments.$inferSelect;
export type NewDealDocument = typeof dealDocuments.$inferInsert;

export type POC = typeof pocs.$inferSelect;
export type NewPOC = typeof pocs.$inferInsert;

export type Questionnaire = typeof questionnaires.$inferSelect;
export type NewQuestionnaire = typeof questionnaires.$inferInsert;

export type Screener = typeof screeners.$inferSelect;
export type NewScreener = typeof screeners.$inferInsert;

export type AiScreening = typeof aiScreenings.$inferSelect;
export type NewAiScreening = typeof aiScreenings.$inferInsert;

export type UserActionLog = typeof userActionLogs.$inferSelect;
export type NewUserActionLog = typeof userActionLogs.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Founder = typeof founders.$inferSelect;
export type NewFounder = typeof founders.$inferInsert;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type DueDiligenceSection = typeof dueDiligenceSections.$inferSelect;
export type NewDueDiligenceSection = typeof dueDiligenceSections.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
