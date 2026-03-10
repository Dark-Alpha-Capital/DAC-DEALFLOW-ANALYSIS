import {
  pgTable,
  text,
  timestamp,
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  decimal,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
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

export const themeStatusEnum = pgEnum("ThemeStatus", [
  "ACTIVE",
  "PAUSED",
  "RETIRED",
]);

export const outreachTypeEnum = pgEnum("OutreachType", [
  "EMAIL",
  "CALL",
  "LINKEDIN",
  "MEETING",
]);

export const reviewStateEnum = pgEnum("ReviewState", [
  "NOT_SEEN",
  "SEEN",
  "REVIEWED",
  "PUBLISHED",
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

export const themes = pgTable("Theme", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(), // Healthcare, Manufacturing, etc.
  status: themeStatusEnum("status").default("ACTIVE").notNull(), // ACTIVE, PAUSED, RETIRED
  capitalPriorityScore: integer("capitalPriorityScore"), // 1–100
  confidenceScore: integer("confidenceScore"), // Conviction level
  createdById: text("createdById").references(() => users.id),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const theses = pgTable(
  "Thesis",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    themeId: text("themeId")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    macroDrivers: text("macroDrivers").array(),
    mispricingHypothesis: text("mispricingHypothesis"),
    valueCreationLevers: text("valueCreationLevers").array(),
    exitLogic: text("exitLogic"),
    riskFactors: text("riskFactors").array(),
    version: text("version").default("1.0"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    thesisThemeIdx: index("thesis_theme_idx").on(table.themeId),
    thesisActiveThemeUniqueIdx: uniqueIndex("thesis_active_theme_unique_idx")
      .on(table.themeId)
      .where(sql`${table.isActive} = true`),
  }),
);

export const industryIntelligence = pgTable(
  "IndustryIntelligence",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    themeId: text("themeId")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    tam: doublePrecision("tam"),
    growthRate: doublePrecision("growthRate"),
    avgEbitdaMargin: doublePrecision("avgEbitdaMargin"),
    avgEntryMultiple: doublePrecision("avgEntryMultiple"),
    avgExitMultiple: doublePrecision("avgExitMultiple"),
    fragmentationScore: integer("fragmentationScore"),
    sponsorPenetration: doublePrecision("sponsorPenetration"),
    cyclicalityScore: integer("cyclicalityScore"),
    disruptionRiskScore: integer("disruptionRiskScore"),
    notes: text("notes"),
    version: text("version").default("1.0"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    industryIntelThemeIdx: index("industry_intel_theme_idx").on(table.themeId),
    industryIntelActiveThemeUniqueIdx: uniqueIndex(
      "industry_intel_active_theme_unique_idx",
    )
      .on(table.themeId)
      .where(sql`${table.isActive} = true`),
  }),
);

export const companyCoverageStatusEnum = pgEnum("CompanyCoverageStatus", [
  "UNCONTACTED",
  "CONTACTED",
  "IN_DISCUSSION",
  "UNDER_LOI",
  "CLOSED",
  "PASSED",
]);

export const companies = pgTable(
  "Company",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),

    name: text("name").notNull(),
    normalizedName: text("normalizedName").notNull(), // dedup via (normalizedName, location) index

    industry: text("industry"),
    location: text("location"),

    // Financial profile (normalized)
    revenueEstimate: doublePrecision("revenueEstimate"),
    ebitdaEstimate: doublePrecision("ebitdaEstimate"),
    ebitdaMarginEstimate: doublePrecision("ebitdaMarginEstimate"),
    recurringRevenuePct: doublePrecision("recurringRevenuePct"),
    customerConcentrationPct: doublePrecision("customerConcentrationPct"),

    founderAgeEstimate: integer("founderAgeEstimate"),

    // Strategic alignment
    themeId: text("themeId").references(() => themes.id),
    attractivenessScore: integer("attractivenessScore"),
    coverageStatus: companyCoverageStatusEnum("coverageStatus")
      .default("UNCONTACTED")
      .notNull(),

    firstSeenAt: timestamp("firstSeenAt"),
    lastSeenAt: timestamp("lastSeenAt"),
    firstSeenFromLeadId: text("firstSeenFromLeadId").references(() => leads.id),
    deletedAt: timestamp("deletedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    companyDedupIdx: index("company_dedup_idx").on(
      table.normalizedName,
      table.location,
    ),
    companyThemeIdx: index("company_theme_idx").on(table.themeId),
    companyFirstSeenFromLeadUniqueIdx: uniqueIndex(
      "company_first_seen_from_lead_unique_idx",
    ).on(table.firstSeenFromLeadId),
  }),
);

export const companyNotes = pgTable(
  "CompanyNote",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),

    companyId: text("companyId")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    title: text("title"),
    content: text("content").notNull(),

    createdById: text("createdById").references(() => users.id),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    companyNotesCompanyIdx: index("company_notes_company_idx").on(
      table.companyId,
    ),
    companyNotesCreatedAtIdx: index("company_notes_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export const themeCompanyCoverage = pgTable(
  "ThemeCompanyCoverage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    themeId: text("themeId")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    companyId: text("companyId")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    coverageStatus: companyCoverageStatusEnum("coverageStatus")
      .default("UNCONTACTED")
      .notNull(),
    lastOutreachAt: timestamp("lastOutreachAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    themeCompanyCoverageThemeIdx: index("theme_company_coverage_theme_idx").on(
      table.themeId,
    ),
    themeCompanyCoverageCompanyIdx: index(
      "theme_company_coverage_company_idx",
    ).on(table.companyId),
    themeCompanyCoverageUniqueIdx: uniqueIndex(
      "theme_company_coverage_unique_idx",
    ).on(table.themeId, table.companyId),
  }),
);

export const themePerformance = pgTable("ThemePerformance", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  themeId: text("themeId").references(() => themes.id),
  dealsSourced: integer("dealsSourced"),
  meetingsHeld: integer("meetingsHeld"),
  loisIssued: integer("loisIssued"),
  dealsClosed: integer("dealsClosed"),
  averageEntryMultiple: doublePrecision("averageEntryMultiple"),
  averageIRR: doublePrecision("averageIRR"),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const leadStatusEnum = pgEnum("LeadStatus", [
  "NEW",
  "PROCESSED",
  "DUPLICATE",
  "REJECTED",
]);

export const leads = pgTable(
  "Lead",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),

    // Raw scraped metadata
    sourceWebsite: text("sourceWebsite").notNull(),
    externalListingId: text("externalListingId"), // broker listing ID if available
    rawTitle: text("rawTitle").notNull(),
    rawDescription: text("rawDescription"),
    rawIndustry: text("rawIndustry"),

    // Raw financials (before normalization)
    revenue: doublePrecision("revenue"),
    ebitda: doublePrecision("ebitda"),
    askingPrice: doublePrecision("askingPrice"),

    // Broker / contact info
    brokerage: text("brokerage"),
    brokerFirstName: text("brokerFirstName"),
    brokerLastName: text("brokerLastName"),
    brokerEmail: text("brokerEmail"),
    brokerPhone: text("brokerPhone"),

    // Company matching (for dedup)
    normalizedCompanyName: text("normalizedCompanyName"),
    companyLocation: text("companyLocation"),

    // Processing state
    status: leadStatusEnum("status").default("NEW").notNull(),
    duplicateCompanyId: text("duplicateCompanyId"),
    processedAt: timestamp("processedAt"),
    deletedAt: timestamp("deletedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    leadDuplicateCompanyIdx: index("lead_duplicate_company_idx").on(
      table.duplicateCompanyId,
    ),
  }),
);

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
  reviewState: reviewStateEnum("reviewState").default("NOT_SEEN").notNull(),
  status: dealStatusEnum("status").default("NOT_SPECIFIED").notNull(),
  chunk_text: text("chunk_text"),
  description: text("description"),
});

export const dealStageEnum = pgEnum("DealStage", [
  "LISTED",
  "INITIAL_REVIEW",
  "SCREENED",
  "MEETING_HELD",
  "IOI_SUBMITTED",
  "LOI_SUBMITTED",
  "DILIGENCE",
  "CLOSED",
  "DEAD",
]);

export const dealOpportunities = pgTable(
  "DealOpportunity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),

    // Relationships
    companyId: text("companyId")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    leadId: text("leadId").references(() => leads.id),

    legacyDealId: text("legacyDealId")
      .references(() => deals.id)
      .unique(),

    // Deal-specific metadata
    sourceWebsite: text("sourceWebsite"),
    brokerage: text("brokerage"),

    // Financial snapshot at listing time
    revenue: doublePrecision("revenue"),
    ebitda: doublePrecision("ebitda"),
    ebitdaMargin: doublePrecision("ebitdaMargin"),

    askingPrice: doublePrecision("askingPrice"),
    impliedMultiple: doublePrecision("impliedMultiple"),

    dealTeaser: text("dealTeaser"),
    description: text("description"),

    dealType: dealTypeEnum("dealType").default("MANUAL").notNull(),
    stage: dealStageEnum("stage").default("LISTED").notNull(),
    status: dealStatusEnum("status").default("AVAILABLE").notNull(),

    tags: text("tags").array().default([]),
    reviewState: reviewStateEnum("reviewState").default("NOT_SEEN").notNull(),

    bitrixId: text("bitrixId"),
    bitrixLink: text("bitrixLink"),
    bitrixCreatedAt: timestamp("bitrixCreatedAt"),

    brokerFirstName: text("brokerFirstName"),
    brokerLastName: text("brokerLastName"),
    brokerEmail: text("brokerEmail"),
    brokerPhone: text("brokerPhone"),
    brokerLinkedIn: text("brokerLinkedIn"),

    userId: text("userId").references(() => users.id),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    dealOppCompanyIdx: index("deal_opp_company_idx").on(table.companyId),
    dealOppStageIdx: index("deal_opp_stage_idx").on(table.stage),
    dealOppStatusIdx: index("deal_opp_status_idx").on(table.status),
  }),
);

export const contactEntityEnum = pgEnum("ContactEntityType", [
  "LEAD",
  "COMPANY",
  "DEAL_OPPORTUNITY",
]);

export const outreach = pgTable("Outreach", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  dealOpportunityId: text("dealOpportunityId").references(
    () => dealOpportunities.id,
  ),
  companyId: text("companyId").references(() => companies.id),

  type: outreachTypeEnum("type").notNull(),
  notes: text("notes"),
  outcome: text("outcome"),

  createdById: text("createdById").references(() => users.id),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contacts = pgTable("Contact", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  entityType: contactEntityEnum("entityType").notNull(),
  entityId: text("entityId").notNull(),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedinUrl"),
  role: text("role"), // Broker, Founder, CFO, Advisor
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
export const aiScreenings = pgTable(
  "AiScreening",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
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
  },
  (table) => ({
    aiScreeningDealOppIdx: index("ai_screening_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
  }),
);

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

export const documentEntityEnum = pgEnum("DocumentEntityType", [
  "LEAD",
  "COMPANY",
  "DEAL_OPPORTUNITY",
]);

export const documents = pgTable("Document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  entityType: documentEntityEnum("entityType").notNull(),
  entityId: text("entityId").notNull(),

  title: text("title").notNull(),
  description: text("description"),
  category: documentCategoryEnum("category").default("OTHER").notNull(),

  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize"),
  mimeType: text("mimeType"),

  uploadedById: text("uploadedById").references(() => users.id),

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
  dealOpportunities: many(dealOpportunities),
  themes: many(themes),
  userActionLogs: many(userActionLogs),
  documents: many(documents),
  outreach: many(outreach),
}));

export const themesRelations = relations(themes, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [themes.createdById],
    references: [users.id],
  }),
  theses: many(theses),
  industryIntelligence: many(industryIntelligence),
  companies: many(companies),
  themePerformance: many(themePerformance),
  companyCoverage: many(themeCompanyCoverage),
}));

export const thesesRelations = relations(theses, ({ one }) => ({
  theme: one(themes, {
    fields: [theses.themeId],
    references: [themes.id],
  }),
}));

export const industryIntelligenceRelations = relations(
  industryIntelligence,
  ({ one }) => ({
    theme: one(themes, {
      fields: [industryIntelligence.themeId],
      references: [themes.id],
    }),
  }),
);

export const themePerformanceRelations = relations(
  themePerformance,
  ({ one }) => ({
    theme: one(themes, {
      fields: [themePerformance.themeId],
      references: [themes.id],
    }),
  }),
);

export const themeCompanyCoverageRelations = relations(
  themeCompanyCoverage,
  ({ one }) => ({
    theme: one(themes, {
      fields: [themeCompanyCoverage.themeId],
      references: [themes.id],
    }),
    company: one(companies, {
      fields: [themeCompanyCoverage.companyId],
      references: [companies.id],
    }),
  }),
);

export const leadsRelations = relations(leads, ({ many, one }) => ({
  dealOpportunities: many(dealOpportunities),
  companiesFirstSeen: many(companies, { relationName: "firstSeenFromLead" }),
  duplicateCompany: one(companies, {
    fields: [leads.duplicateCompanyId],
    references: [companies.id],
    relationName: "duplicateCompany",
  }),
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

export const dealsRelations = relations(deals, ({ one }) => ({
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
  dealOpportunity: one(dealOpportunities, {
    fields: [deals.id],
    references: [dealOpportunities.legacyDealId],
  }),
}));

export const dealOpportunitiesRelations = relations(
  dealOpportunities,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [dealOpportunities.companyId],
      references: [companies.id],
    }),
    lead: one(leads, {
      fields: [dealOpportunities.leadId],
      references: [leads.id],
    }),
    user: one(users, {
      fields: [dealOpportunities.userId],
      references: [users.id],
    }),
    legacyDeal: one(deals, {
      fields: [dealOpportunities.legacyDealId],
      references: [deals.id],
    }),
    aiScreenings: many(aiScreenings),
    outreach: many(outreach),
  }),
);

export const companiesRelations = relations(companies, ({ one, many }) => ({
  theme: one(themes, {
    fields: [companies.themeId],
    references: [themes.id],
  }),
  firstSeenFromLead: one(leads, {
    fields: [companies.firstSeenFromLeadId],
    references: [leads.id],
    relationName: "firstSeenFromLead",
  }),
  duplicateLeads: many(leads, { relationName: "duplicateCompany" }),
  dealOpportunities: many(dealOpportunities),
  notes: many(companyNotes),
  outreach: many(outreach),
  themeCoverage: many(themeCompanyCoverage),
}));

export const companyNotesRelations = relations(companyNotes, ({ one }) => ({
  company: one(companies, {
    fields: [companyNotes.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [companyNotes.createdById],
    references: [users.id],
  }),
}));

export const screenersRelations = relations(screeners, ({ many }) => ({
  aiScreenings: many(aiScreenings),
}));

export const aiScreeningsRelations = relations(aiScreenings, ({ one }) => ({
  dealOpportunity: one(dealOpportunities, {
    fields: [aiScreenings.dealOpportunityId],
    references: [dealOpportunities.id],
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

export const outreachRelations = relations(outreach, ({ one }) => ({
  dealOpportunity: one(dealOpportunities, {
    fields: [outreach.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
  company: one(companies, {
    fields: [outreach.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [outreach.createdById],
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

export const DealStage = {
  LISTED: "LISTED",
  INITIAL_REVIEW: "INITIAL_REVIEW",
  SCREENED: "SCREENED",
  MEETING_HELD: "MEETING_HELD",
  IOI_SUBMITTED: "IOI_SUBMITTED",
  LOI_SUBMITTED: "LOI_SUBMITTED",
  DILIGENCE: "DILIGENCE",
  CLOSED: "CLOSED",
  DEAD: "DEAD",
} as const;
export type DealStage = (typeof DealStage)[keyof typeof DealStage];

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

export const ReviewState = {
  NOT_SEEN: "NOT_SEEN",
  SEEN: "SEEN",
  REVIEWED: "REVIEWED",
  PUBLISHED: "PUBLISHED",
} as const;
export type ReviewState = (typeof ReviewState)[keyof typeof ReviewState];

export const Sentiment = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
} as const;
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];

export const OutreachType = {
  EMAIL: "EMAIL",
  CALL: "CALL",
  LINKEDIN: "LINKEDIN",
  MEETING: "MEETING",
} as const;
export type OutreachType = (typeof OutreachType)[keyof typeof OutreachType];

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

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Questionnaire = typeof questionnaires.$inferSelect;
export type NewQuestionnaire = typeof questionnaires.$inferInsert;

export type Screener = typeof screeners.$inferSelect;
export type NewScreener = typeof screeners.$inferInsert;

export type DealOpportunity = typeof dealOpportunities.$inferSelect;
export type NewDealOpportunity = typeof dealOpportunities.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type CompanyNote = typeof companyNotes.$inferSelect;
export type NewCompanyNote = typeof companyNotes.$inferInsert;

export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
export type Thesis = typeof theses.$inferSelect;
export type NewThesis = typeof theses.$inferInsert;
export type IndustryIntelligence = typeof industryIntelligence.$inferSelect;
export type NewIndustryIntelligence = typeof industryIntelligence.$inferInsert;
export type ThemePerformance = typeof themePerformance.$inferSelect;
export type NewThemePerformance = typeof themePerformance.$inferInsert;
export type ThemeCompanyCoverage = typeof themeCompanyCoverage.$inferSelect;
export type NewThemeCompanyCoverage = typeof themeCompanyCoverage.$inferInsert;

export type AiScreening = typeof aiScreenings.$inferSelect;
export type NewAiScreening = typeof aiScreenings.$inferInsert;

export type UserActionLog = typeof userActionLogs.$inferSelect;
export type NewUserActionLog = typeof userActionLogs.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Outreach = typeof outreach.$inferSelect;
export type NewOutreach = typeof outreach.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
