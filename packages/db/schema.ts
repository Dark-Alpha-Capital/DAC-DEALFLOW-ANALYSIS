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

// Unified document category enum (merges FileCategory and DealDocumentCategory)
export const documentCategoryEnum = pgEnum("DocumentCategory", [
  // From FileCategory
  "FINANCIALS",
  "LEGAL",
  "TAX",
  "TECHNICAL",
  "COMMERCIAL",
  "ESG",
  "MARKETING",
  "OPERATIONS",
  // From DealDocumentCategory (merged/renamed)
  "DOCUMENTATION",
  "INVESTOR_RELATIONSHIPS",
  "TOOLS",
  "LEGISLATION",
  "RESEARCH",
  "PROSPECTUS",
  "OTHER",
]);

// Entity type enum for polymorphic association
export const entityTypeEnum = pgEnum("EntityType", ["DEAL", "COMPANY"]);

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

// Unified Document table (replaces both dealDocuments and files)
export const documents = pgTable("Document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  // Polymorphic association
  entityType: entityTypeEnum("entityType").notNull(),
  entityId: text("entityId").notNull(), // References deals.id or companies.id

  // Core file metadata
  title: text("title").notNull(),
  description: text("description"),
  caption: text("caption"), // From dealDocuments
  category: documentCategoryEnum("category").default("OTHER").notNull(),
  tags: text("tags").array().default([]),

  // File storage
  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize"),
  mimeType: text("mimeType"), // Replaces fileType from dealDocuments

  // Vector store integration (optional)
  vectorStoreDocumentName: text("vectorStoreDocumentName"), // Google File Search Store reference

  // Versioning (optional)
  version: text("version").default("1.0").notNull(),
  isLatest: boolean("isLatest").default(true).notNull(),

  // Upload tracking
  uploadedById: text("uploadedById").references(() => users.id),

  // Additional metadata
  comments: text("comments"), // From files

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});


// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  deals: many(deals),
  userActionLogs: many(userActionLogs),
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

export const dealsRelations = relations(deals, ({ one, many }) => ({
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
  aiScreenings: many(aiScreenings),
  pocs: many(pocs),
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

export const documentsRelations = relations(documents, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
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

export const DocumentCategory = {
  FINANCIALS: "FINANCIALS",
  LEGAL: "LEGAL",
  TAX: "TAX",
  TECHNICAL: "TECHNICAL",
  COMMERCIAL: "COMMERCIAL",
  ESG: "ESG",
  MARKETING: "MARKETING",
  OPERATIONS: "OPERATIONS",
  DOCUMENTATION: "DOCUMENTATION",
  INVESTOR_RELATIONSHIPS: "INVESTOR_RELATIONSHIPS",
  TOOLS: "TOOLS",
  LEGISLATION: "LEGISLATION",
  RESEARCH: "RESEARCH",
  PROSPECTUS: "PROSPECTUS",
  OTHER: "OTHER",
} as const;
export type DocumentCategory =
  (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const EntityType = {
  DEAL: "DEAL",
  COMPANY: "COMPANY",
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

// Model type exports (inferred from tables)
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;

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

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
