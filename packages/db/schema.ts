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
  jsonb,
  vector,
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
  // Firm-level global document categories
  "OPERATING_PLAYBOOK",
  "INVESTMENT_MEMO",
  "IC_TEMPLATE",
  "INDUSTRY_RESEARCH",
  "VALUE_CREATION_PLAYBOOK",
  "PAST_DEAL_ANALYSIS",
  "DUE_DILIGENCE_CHECKLIST",
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

export const dealScreeningStatusEnum = pgEnum("DealScreeningStatus", [
  "PASS",
  "FAIL",
  "INCOMPLETE",
]);

export const screenerResponseTypeEnum = pgEnum("ScreenerResponseType", [
  "SCORE",
]);

export const screenerResponseSourceEnum = pgEnum("ScreenerResponseSource", [
  "AI",
  "HUMAN",
]);

export const dealSimStatusEnum = pgEnum("DealSimStatus", [
  "ACTIVE",
  "ARCHIVED",
]);

export const cimExtractionSourceEnum = pgEnum("CIMExtractionSource", [
  "AI",
  "USER",
]);

export const dealFinancialSnapshotSourceEnum = pgEnum(
  "DealFinancialSnapshotSource",
  [
    "LISTING",
    "BROKER_CALL",
    "CIM",
    "MANAGEMENT_MEETING",
    "DILIGENCE",
    "MANUAL",
  ],
);

export const companyFinancialSnapshotSourceEnum = pgEnum(
  "CompanyFinancialSnapshotSource",
  ["MANAGEMENT", "CIM", "MANUAL"],
);

export const dealRiskTypeEnum = pgEnum("DealRiskType", [
  "CUSTOMER_CONCENTRATION",
  "CAPEX",
  "QUALITY_OF_EARNINGS",
  "WORKING_CAPITAL",
  "OTHER",
]);

export const dealRiskSeverityEnum = pgEnum("DealRiskSeverity", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const dealRiskSourceEnum = pgEnum("DealRiskSource", ["SYSTEM", "USER"]);

// Capital CRM layer
export const investorTypeEnum = pgEnum("InvestorType", [
  "HNWI",
  "FAMILY_OFFICE",
  "INSTITUTION",
]);
export const investorStatusEnum = pgEnum("InvestorStatus", [
  "PROSPECT",
  "QUALIFIED",
  "ACTIVE",
  "INACTIVE",
]);
export const investorLeadStatusEnum = pgEnum("InvestorLeadStatus", [
  "RAW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "REJECTED",
]);
export const investorInteractionTypeEnum = pgEnum("InvestorInteractionType", [
  "EMAIL",
  "CALL",
  "MEETING",
  "EVENT",
  "INTRO",
]);
export const investorRiskProfileEnum = pgEnum("InvestorRiskProfile", [
  "CONSERVATIVE",
  "MODERATE",
  "BALANCED",
  "GROWTH",
  "AGGRESSIVE",
]);

export const investorCompanyLinkStatusEnum = pgEnum(
  "InvestorCompanyLinkStatus",
  ["ACTIVE", "ARCHIVED"],
);

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
  createdById: text("createdById").references(() => users.id, {
    onDelete: "set null",
  }),
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

    // Structured business profile
    businessModel: text("businessModel"),
    employees: integer("employees"),
    revenueTtm: doublePrecision("revenueTtm"),
    ebitdaTtm: doublePrecision("ebitdaTtm"),
    grossMargin: doublePrecision("grossMargin"),
    revenueCagr: doublePrecision("revenueCagr"),
    totalClients: integer("totalClients"),
    top10Concentration: doublePrecision("top10Concentration"),
    customerIndustries: text("customerIndustries").array(),
    revenueModelType: text("revenueModelType"),
    expansionModel: text("expansionModel"),
    concentrationHigh: boolean("concentrationHigh"),
    marginLow: boolean("marginLow"),
    vendorDependency: boolean("vendorDependency"),
    growthLevers: text("growthLevers").array(),

    // Strategic alignment
    themeId: text("themeId").references(() => themes.id, {
      onDelete: "set null",
    }),
    attractivenessScore: integer("attractivenessScore"),
    coverageStatus: companyCoverageStatusEnum("coverageStatus")
      .default("UNCONTACTED")
      .notNull(),

    firstSeenAt: timestamp("firstSeenAt"),
    lastSeenAt: timestamp("lastSeenAt"),
    firstSeenFromLeadId: text("firstSeenFromLeadId"),
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

    createdById: text("createdById").references(() => users.id, {
      onDelete: "set null",
    }),

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
  themeId: text("themeId").references(() => themes.id, {
    onDelete: "set null",
  }),
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
    duplicateCompanyId: text("duplicateCompanyId").references(
      () => companies.id,
      {
        onDelete: "set null",
      },
    ),
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
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
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

    leadId: text("leadId").references(() => leads.id, { onDelete: "set null" }),

    legacyDealId: text("legacyDealId")
      .references(() => deals.id, { onDelete: "set null" })
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

    userId: text("userId").references(() => users.id, { onDelete: "set null" }),

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

export const dealFinancialSnapshots = pgTable(
  "DealFinancialSnapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    revenue: doublePrecision("revenue"),
    ebitda: doublePrecision("ebitda"),
    ebitdaMargin: doublePrecision("ebitdaMargin"),
    askingPrice: doublePrecision("askingPrice"),
    impliedMultiple: doublePrecision("impliedMultiple"),
    source: dealFinancialSnapshotSourceEnum("source").notNull(),
    notes: text("notes"),
    createdById: text("createdById").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    dealFinancialSnapshotDealOppIdx: index("deal_fin_snapshot_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
    dealFinancialSnapshotDealOppCreatedAtIdx: index(
      "deal_fin_snapshot_deal_opp_created_at_idx",
    ).on(table.dealOpportunityId, table.createdAt),
    dealFinancialSnapshotDealOppSourceCreatedAtIdx: index(
      "deal_fin_snapshot_deal_opp_source_created_at_idx",
    ).on(table.dealOpportunityId, table.source, table.createdAt),
  }),
);

export const companyFinancialSnapshots = pgTable(
  "CompanyFinancialSnapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    companyId: text("companyId")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    periodEnd: timestamp("periodEnd").notNull(),
    revenue: doublePrecision("revenue"),
    ebitda: doublePrecision("ebitda"),
    grossMargin: doublePrecision("grossMargin"),
    revenueCagr: doublePrecision("revenueCagr"),
    employees: integer("employees"),
    totalClients: integer("totalClients"),
    top10Concentration: doublePrecision("top10Concentration"),
    recurringRevenuePct: doublePrecision("recurringRevenuePct"),
    source: companyFinancialSnapshotSourceEnum("source").notNull(),
    notes: text("notes"),
    createdById: text("createdById").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    companyFinancialSnapshotCompanyIdx: index(
      "company_fin_snapshot_company_idx",
    ).on(table.companyId),
    companyFinancialSnapshotCompanyPeriodIdx: index(
      "company_fin_snapshot_company_period_idx",
    ).on(table.companyId, table.periodEnd),
  }),
);

export const dealRiskFlags = pgTable(
  "DealRiskFlag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    riskType: dealRiskTypeEnum("riskType").notNull(),
    severity: dealRiskSeverityEnum("severity").notNull(),
    description: text("description").notNull(),
    source: dealRiskSourceEnum("source").default("USER").notNull(),
    createdById: text("createdById").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    dealRiskFlagDealOppIdx: index("deal_risk_flag_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
    dealRiskFlagDealOppCreatedAtIdx: index(
      "deal_risk_flag_deal_opp_created_at_idx",
    ).on(table.dealOpportunityId, table.createdAt),
    dealRiskFlagDealOppTypeSeverityIdx: index(
      "deal_risk_flag_deal_opp_type_severity_idx",
    ).on(table.dealOpportunityId, table.riskType, table.severity),
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
    { onDelete: "cascade" },
  ),
  companyId: text("companyId").references(() => companies.id, {
    onDelete: "cascade",
  }),

  type: outreachTypeEnum("type").notNull(),
  notes: text("notes"),
  outcome: text("outcome"),

  createdById: text("createdById").references(() => users.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contacts = pgTable("Contact", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  entityType: contactEntityEnum("entityType").notNull(),
  entityId: text("entityId").notNull(),
  companyId: text("companyId").references(() => companies.id, {
    onDelete: "cascade",
  }),
  leadId: text("leadId").references(() => leads.id, { onDelete: "cascade" }),
  dealOpportunityId: text("dealOpportunityId").references(
    () => dealOpportunities.id,
    { onDelete: "cascade" },
  ),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedinUrl"),
  role: text("role"),
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

export const screenerTemplates = pgTable(
  "ScreenerTemplate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    screenerTemplateCategoryIdx: index("screener_template_category_idx").on(
      table.category,
    ),
    screenerTemplateNameIdx: index("screener_template_name_idx").on(table.name),
  }),
);

export const screeners = screenerTemplates;

export const screenerQuestions = pgTable(
  "ScreenerQuestion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    screenerId: text("screenerId")
      .notNull()
      .references(() => screenerTemplates.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    weight: integer("weight").default(10).notNull(),
    responseType: screenerResponseTypeEnum("responseType")
      .default("SCORE")
      .notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    screenerQuestionScreenerIdx: index("screener_question_screener_idx").on(
      table.screenerId,
    ),
    screenerQuestionOrderUniqueIdx: uniqueIndex(
      "screener_question_order_unique_idx",
    ).on(table.screenerId, table.position),
  }),
);

export const screenerResponses = pgTable(
  "ScreenerResponse",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    questionId: text("questionId")
      .notNull()
      .references(() => screenerQuestions.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    source: screenerResponseSourceEnum("source").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    screenerResponseDealOppIdx: index("screener_response_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
    screenerResponseQuestionIdx: index("screener_response_question_idx").on(
      table.questionId,
    ),
    screenerResponseUniqueIdx: uniqueIndex("screener_response_unique_idx").on(
      table.dealOpportunityId,
      table.questionId,
      table.source,
    ),
  }),
);

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

export const dealOpportunityScreenings = pgTable(
  "DealOpportunityScreening",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    status: dealScreeningStatusEnum("status").notNull(),
    passed: boolean("passed").notNull().default(false),
    reasons: text("reasons").array().notNull().default([]),
    score: integer("score"),
    ebitdaFitScore: integer("ebitdaFitScore"),
    revenueScore: integer("revenueScore"),
    industryScore: integer("industryScore"),
    profileKey: text("profileKey").notNull(),
    profileVersion: text("profileVersion").notNull(),
    screenedAt: timestamp("screenedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    dealOpportunityScreeningDealUniqueIdx: uniqueIndex(
      "deal_opp_screening_deal_unique_idx",
    ).on(table.dealOpportunityId),
    dealOpportunityScreeningStatusIdx: index(
      "deal_opp_screening_status_idx",
    ).on(table.status),
    dealOpportunityScreeningScoreIdx: index("deal_opp_screening_score_idx").on(
      table.score,
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
    .references(() => users.id, { onDelete: "cascade" }),
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
  "THEME",
  "GLOBAL",
]);

export const documentIngestionStatusEnum = pgEnum("DocumentIngestionStatus", [
  "PENDING",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
  "SKIPPED",
]);

export const documentChunkModalityEnum = pgEnum("DocumentChunkModality", [
  "TEXT",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "PDF",
]);

export const documents = pgTable("Document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  entityType: documentEntityEnum("entityType").notNull(),
  entityId: text("entityId"), // Nullable for GLOBAL documents
  companyId: text("companyId").references(() => companies.id, {
    onDelete: "cascade",
  }),
  leadId: text("leadId").references(() => leads.id, { onDelete: "cascade" }),
  dealOpportunityId: text("dealOpportunityId").references(
    () => dealOpportunities.id,
    { onDelete: "cascade" },
  ),
  themeId: text("themeId").references(() => themes.id, {
    onDelete: "cascade",
  }),

  title: text("title").notNull(),
  description: text("description"),
  category: documentCategoryEnum("category").default("OTHER").notNull(),

  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize"),
  mimeType: text("mimeType"),
  ingestionStatus: documentIngestionStatusEnum("ingestionStatus")
    .default("PENDING")
    .notNull(),
  ingestionStartedAt: timestamp("ingestionStartedAt"),
  ingestionCompletedAt: timestamp("ingestionCompletedAt"),
  ingestionAttemptCount: integer("ingestionAttemptCount").default(0).notNull(),
  ingestionError: text("ingestionError"),

  uploadedById: text("uploadedById").references(() => users.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const documentChunks = pgTable(
  "DocumentChunk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    documentId: text("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    entityType: documentEntityEnum("entityType").notNull(),
    entityId: text("entityId"),
    dealOpportunityId: text("dealOpportunityId").references(
      () => dealOpportunities.id,
      { onDelete: "cascade" },
    ),
    companyId: text("companyId").references(() => companies.id, {
      onDelete: "cascade",
    }),
    themeId: text("themeId").references(() => themes.id, {
      onDelete: "cascade",
    }),
    chunkText: text("chunkText"),
    modality: documentChunkModalityEnum("modality").default("TEXT").notNull(),
    embedding: vector("embedding", { dimensions: 768 }),
    metadata: jsonb("metadata"),
    pageNumber: integer("pageNumber"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    documentChunkDocumentIdx: index("document_chunk_document_idx").on(
      table.documentId,
    ),
    documentChunkEntityIdx: index("document_chunk_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    documentChunkDealOppIdx: index("document_chunk_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
    documentChunkCompanyIdx: index("document_chunk_company_idx").on(
      table.companyId,
    ),
    documentChunkThemeIdx: index("document_chunk_theme_idx").on(table.themeId),
  }),
);

/**
 * Deal SIMs (CIMs) - one active per deal opportunity.
 * Latest upload becomes active; previous is archived.
 */
export const dealSims = pgTable(
  "DealSim",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    documentId: text("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    storageKey: text("storageKey").notNull(), // Path in object storage for worker
    status: dealSimStatusEnum("status").default("ACTIVE").notNull(),
    uploadedById: text("uploadedById").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  },
  (table) => ({
    dealSimDealOppIdx: index("deal_sim_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
    dealSimActiveUniqueIdx: uniqueIndex("deal_sim_active_unique_idx")
      .on(table.dealOpportunityId)
      .where(sql`${table.status} = 'ACTIVE'`),
  }),
);

export const cimExtractions = pgTable(
  "CIMExtraction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    simId: text("simId").references(() => dealSims.id, { onDelete: "cascade" }),
    documentId: text("documentId").references(() => documents.id, {
      onDelete: "cascade",
    }), // Denormalized; primary link is simId
    dealOpportunityId: text("dealOpportunityId").references(
      () => dealOpportunities.id,
      { onDelete: "cascade" },
    ), // Denormalized for queries

    revenueHistory: jsonb("revenueHistory").$type<Record<string, number>>(),
    ebitdaHistory: jsonb("ebitdaHistory").$type<Record<string, number>>(),
    employeeCount: integer("employeeCount"),
    customerConcentration: doublePrecision("customerConcentration"),
    capexIntensity: text("capexIntensity"),
    revenueBreakdown: jsonb("revenueBreakdown").$type<Record<string, number>>(),
    growthDrivers: text("growthDrivers").array(),
    keyRisks: text("keyRisks").array(),
    industryOverview: text("industryOverview"),
    transactionDetails: text("transactionDetails"),

    source: cimExtractionSourceEnum("source").default("AI").notNull(),
    updatedByUserId: text("updatedByUserId").references(() => users.id, {
      onDelete: "set null",
    }),

    modelName: text("modelName"),
    version: text("version"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    cimExtractionSimIdx: index("cim_extraction_sim_idx").on(table.simId),
    cimExtractionSimUniqueIdx: uniqueIndex("cim_extraction_sim_unique_idx").on(
      table.simId,
    ),
    cimExtractionDealOppIdx: index("cim_extraction_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
  }),
);

// Simple dummy tables for migration verification
export const cimExtractionDebugs = pgTable("CIMExtractionDebug", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const cimExtractionLogs = pgTable("CIMExtractionLog", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  dealOpportunityId: text("dealOpportunityId").references(
    () => dealOpportunities.id,
    { onDelete: "cascade" },
  ),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const chatSessions = pgTable(
  "ChatSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    provider: text("provider").notNull().default("openai"),
    model: text("model").notNull().default("gpt-5-mini"),
    companyId: text("companyId").references(() => companies.id, {
      onDelete: "set null",
    }),
    leadId: text("leadId").references(() => leads.id, {
      onDelete: "set null",
    }),
    dealOpportunityId: text("dealOpportunityId").references(
      () => dealOpportunities.id,
      { onDelete: "set null" },
    ),
    messages: jsonb("messages")
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    chatSessionUserIdx: index("chat_session_user_idx").on(table.userId),
    chatSessionUserUpdatedIdx: index("chat_session_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

// ----------------------------------------------------------------------------
// Capital CRM layer
// ----------------------------------------------------------------------------

export const investors = pgTable("Investor", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  type: investorTypeEnum("type").notNull(),
  primaryContactName: text("primaryContactName"),
  email: text("email"),
  phone: text("phone"),
  geography: text("geography"),
  minCheckSize: decimal("minCheckSize"),
  maxCheckSize: decimal("maxCheckSize"),
  sectorFocus: text("sectorFocus").array(),
  stagePreference: text("stagePreference").array(),
  riskProfile: investorRiskProfileEnum("riskProfile"),
  status: investorStatusEnum("status").default("PROSPECT").notNull(),
  firstSeenFromInvestorLeadId: text("firstSeenFromInvestorLeadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const investorLeads = pgTable(
  "InvestorLead",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name"),
    source: text("source"),
    email: text("email"),
    phone: text("phone"),
    inferredType: text("inferredType"),
    notes: text("notes"),
    status: investorLeadStatusEnum("status").default("RAW").notNull(),
    ownerUserId: text("ownerUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    investorLeadOwnerIdx: index("investor_lead_owner_idx").on(
      table.ownerUserId,
    ),
    investorLeadStatusIdx: index("investor_lead_status_idx").on(table.status),
  }),
);

export const investorInteractions = pgTable(
  "InvestorInteraction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    investorId: text("investorId").references(() => investors.id, {
      onDelete: "cascade",
    }),
    investorLeadId: text("investorLeadId").references(() => investorLeads.id, {
      onDelete: "cascade",
    }),
    type: investorInteractionTypeEnum("type"),
    notes: text("notes"),
    outcome: text("outcome"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    investorInteractionInvestorIdx: index(
      "investor_interaction_investor_idx",
    ).on(table.investorId, table.createdAt),
    investorInteractionLeadIdx: index("investor_interaction_lead_idx").on(
      table.investorLeadId,
      table.createdAt,
    ),
  }),
);

/** Many-to-many: investor linked to companies they represent or were sourced from. */
export const investorCompanyLinks = pgTable(
  "InvestorCompanyLink",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    investorId: text("investorId")
      .notNull()
      .references(() => investors.id, { onDelete: "cascade" }),
    companyId: text("companyId")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    status: investorCompanyLinkStatusEnum("status").default("ACTIVE").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    investorCompanyLinkInvestorCompanyUniqueIdx: uniqueIndex(
      "investor_company_link_investor_company_unique_idx",
    ).on(table.investorId, table.companyId),
    investorCompanyLinkStatusIdx: index("investor_company_link_status_idx").on(
      table.status,
    ),
    investorCompanyLinkCreatedAtIdx: index(
      "investor_company_link_created_at_idx",
    ).on(table.createdAt),
  }),
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  deals: many(deals),
  dealOpportunities: many(dealOpportunities),
  dealFinancialSnapshots: many(dealFinancialSnapshots),
  dealRiskFlags: many(dealRiskFlags),
  themes: many(themes),
  userActionLogs: many(userActionLogs),
  documents: many(documents),
  outreach: many(outreach),
  chatSessions: many(chatSessions),
  investorLeads: many(investorLeads),
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
  documents: many(documents),
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
    deterministicScreening: one(dealOpportunityScreenings, {
      fields: [dealOpportunities.id],
      references: [dealOpportunityScreenings.dealOpportunityId],
    }),
    screenerResponses: many(screenerResponses),
    outreach: many(outreach),
    financialSnapshots: many(dealFinancialSnapshots),
    riskFlags: many(dealRiskFlags),
    cimExtraction: one(cimExtractions, {
      fields: [dealOpportunities.id],
      references: [cimExtractions.dealOpportunityId],
    }),
    dealSims: many(dealSims),
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
  financialSnapshots: many(companyFinancialSnapshots),
  investorLinks: many(investorCompanyLinks),
}));

export const dealFinancialSnapshotsRelations = relations(
  dealFinancialSnapshots,
  ({ one }) => ({
    dealOpportunity: one(dealOpportunities, {
      fields: [dealFinancialSnapshots.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
    createdBy: one(users, {
      fields: [dealFinancialSnapshots.createdById],
      references: [users.id],
    }),
  }),
);

export const companyFinancialSnapshotsRelations = relations(
  companyFinancialSnapshots,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyFinancialSnapshots.companyId],
      references: [companies.id],
    }),
    createdBy: one(users, {
      fields: [companyFinancialSnapshots.createdById],
      references: [users.id],
    }),
  }),
);

export const dealRiskFlagsRelations = relations(dealRiskFlags, ({ one }) => ({
  dealOpportunity: one(dealOpportunities, {
    fields: [dealRiskFlags.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
  createdBy: one(users, {
    fields: [dealRiskFlags.createdById],
    references: [users.id],
  }),
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
  questions: many(screenerQuestions),
  aiScreenings: many(aiScreenings),
}));

export const screenerQuestionsRelations = relations(
  screenerQuestions,
  ({ one, many }) => ({
    screener: one(screeners, {
      fields: [screenerQuestions.screenerId],
      references: [screeners.id],
    }),
    responses: many(screenerResponses),
  }),
);

export const screenerResponsesRelations = relations(
  screenerResponses,
  ({ one }) => ({
    dealOpportunity: one(dealOpportunities, {
      fields: [screenerResponses.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
    question: one(screenerQuestions, {
      fields: [screenerResponses.questionId],
      references: [screenerQuestions.id],
    }),
  }),
);

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

export const dealOpportunityScreeningsRelations = relations(
  dealOpportunityScreenings,
  ({ one }) => ({
    dealOpportunity: one(dealOpportunities, {
      fields: [dealOpportunityScreenings.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
  }),
);

export const userActionLogsRelations = relations(userActionLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActionLogs.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
  theme: one(themes, {
    fields: [documents.themeId],
    references: [themes.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const dealSimsRelations = relations(dealSims, ({ one, many }) => ({
  dealOpportunity: one(dealOpportunities, {
    fields: [dealSims.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
  document: one(documents, {
    fields: [dealSims.documentId],
    references: [documents.id],
  }),
  uploadedBy: one(users, {
    fields: [dealSims.uploadedById],
    references: [users.id],
  }),
  cimExtractions: many(cimExtractions),
}));

export const cimExtractionsRelations = relations(cimExtractions, ({ one }) => ({
  sim: one(dealSims, {
    fields: [cimExtractions.simId],
    references: [dealSims.id],
  }),
  document: one(documents, {
    fields: [cimExtractions.documentId],
    references: [documents.id],
  }),
  dealOpportunity: one(dealOpportunities, {
    fields: [cimExtractions.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
  updatedBy: one(users, {
    fields: [cimExtractions.updatedByUserId],
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

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [chatSessions.companyId],
    references: [companies.id],
  }),
  lead: one(leads, {
    fields: [chatSessions.leadId],
    references: [leads.id],
  }),
  dealOpportunity: one(dealOpportunities, {
    fields: [chatSessions.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
}));

export const investorsRelations = relations(investors, ({ one, many }) => ({
  interactions: many(investorInteractions),
  companyLinks: many(investorCompanyLinks),
  firstSeenFromInvestorLead: one(investorLeads, {
    fields: [investors.firstSeenFromInvestorLeadId],
    references: [investorLeads.id],
    relationName: "firstSeenFromInvestorLead",
  }),
}));

export const investorLeadsRelations = relations(
  investorLeads,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [investorLeads.ownerUserId],
      references: [users.id],
    }),
    interactions: many(investorInteractions),
    investorsFirstSeen: many(investors, {
      relationName: "firstSeenFromInvestorLead",
    }),
  }),
);

export const investorInteractionsRelations = relations(
  investorInteractions,
  ({ one }) => ({
    investor: one(investors, {
      fields: [investorInteractions.investorId],
      references: [investors.id],
    }),
    investorLead: one(investorLeads, {
      fields: [investorInteractions.investorLeadId],
      references: [investorLeads.id],
    }),
  }),
);

export const investorCompanyLinksRelations = relations(
  investorCompanyLinks,
  ({ one }) => ({
    investor: one(investors, {
      fields: [investorCompanyLinks.investorId],
      references: [investors.id],
    }),
    company: one(companies, {
      fields: [investorCompanyLinks.companyId],
      references: [companies.id],
    }),
  }),
);

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

export const DealScreeningStatus = {
  PASS: "PASS",
  FAIL: "FAIL",
  INCOMPLETE: "INCOMPLETE",
} as const;
export type DealScreeningStatus =
  (typeof DealScreeningStatus)[keyof typeof DealScreeningStatus];

export const Sentiment = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
} as const;
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];

export const ScreenerResponseType = {
  SCORE: "SCORE",
} as const;
export type ScreenerResponseType =
  (typeof ScreenerResponseType)[keyof typeof ScreenerResponseType];

export const ScreenerResponseSource = {
  AI: "AI",
  HUMAN: "HUMAN",
} as const;
export type ScreenerResponseSource =
  (typeof ScreenerResponseSource)[keyof typeof ScreenerResponseSource];

export const OutreachType = {
  EMAIL: "EMAIL",
  CALL: "CALL",
  LINKEDIN: "LINKEDIN",
  MEETING: "MEETING",
} as const;
export type OutreachType = (typeof OutreachType)[keyof typeof OutreachType];

export const DealFinancialSnapshotSource = {
  LISTING: "LISTING",
  BROKER_CALL: "BROKER_CALL",
  CIM: "CIM",
  MANAGEMENT_MEETING: "MANAGEMENT_MEETING",
  DILIGENCE: "DILIGENCE",
  MANUAL: "MANUAL",
} as const;
export type DealFinancialSnapshotSource =
  (typeof DealFinancialSnapshotSource)[keyof typeof DealFinancialSnapshotSource];

export const CompanyFinancialSnapshotSource = {
  MANAGEMENT: "MANAGEMENT",
  CIM: "CIM",
  MANUAL: "MANUAL",
} as const;
export type CompanyFinancialSnapshotSource =
  (typeof CompanyFinancialSnapshotSource)[keyof typeof CompanyFinancialSnapshotSource];

export const DealRiskType = {
  CUSTOMER_CONCENTRATION: "CUSTOMER_CONCENTRATION",
  CAPEX: "CAPEX",
  QUALITY_OF_EARNINGS: "QUALITY_OF_EARNINGS",
  WORKING_CAPITAL: "WORKING_CAPITAL",
  OTHER: "OTHER",
} as const;
export type DealRiskType = (typeof DealRiskType)[keyof typeof DealRiskType];

export const DealRiskSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type DealRiskSeverity =
  (typeof DealRiskSeverity)[keyof typeof DealRiskSeverity];

export const DealRiskSource = {
  SYSTEM: "SYSTEM",
  USER: "USER",
} as const;
export type DealRiskSource =
  (typeof DealRiskSource)[keyof typeof DealRiskSource];

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
  // Firm-level global document categories
  OPERATING_PLAYBOOK: "OPERATING_PLAYBOOK",
  INVESTMENT_MEMO: "INVESTMENT_MEMO",
  IC_TEMPLATE: "IC_TEMPLATE",
  INDUSTRY_RESEARCH: "INDUSTRY_RESEARCH",
  VALUE_CREATION_PLAYBOOK: "VALUE_CREATION_PLAYBOOK",
  PAST_DEAL_ANALYSIS: "PAST_DEAL_ANALYSIS",
  DUE_DILIGENCE_CHECKLIST: "DUE_DILIGENCE_CHECKLIST",
} as const;
export type DocumentCategory =
  (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const EntityType = {
  DEAL: "DEAL",
  COMPANY: "COMPANY",
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const DocumentIngestionStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;
export type DocumentIngestionStatus =
  (typeof DocumentIngestionStatus)[keyof typeof DocumentIngestionStatus];

export const DocumentChunkModality = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  PDF: "PDF",
} as const;
export type DocumentChunkModality =
  (typeof DocumentChunkModality)[keyof typeof DocumentChunkModality];

export const InvestorCompanyLinkStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type InvestorCompanyLinkStatus =
  (typeof InvestorCompanyLinkStatus)[keyof typeof InvestorCompanyLinkStatus];

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

export type ScreenerTemplate = typeof screenerTemplates.$inferSelect;
export type NewScreenerTemplate = typeof screenerTemplates.$inferInsert;
export type Screener = ScreenerTemplate;
export type NewScreener = NewScreenerTemplate;

export type ScreenerQuestion = typeof screenerQuestions.$inferSelect;
export type NewScreenerQuestion = typeof screenerQuestions.$inferInsert;

export type ScreenerResponse = typeof screenerResponses.$inferSelect;
export type NewScreenerResponse = typeof screenerResponses.$inferInsert;

export type DealOpportunity = typeof dealOpportunities.$inferSelect;
export type NewDealOpportunity = typeof dealOpportunities.$inferInsert;
export type DealFinancialSnapshot = typeof dealFinancialSnapshots.$inferSelect;
export type NewDealFinancialSnapshot =
  typeof dealFinancialSnapshots.$inferInsert;
export type DealRiskFlag = typeof dealRiskFlags.$inferSelect;
export type NewDealRiskFlag = typeof dealRiskFlags.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type CompanyFinancialSnapshot =
  typeof companyFinancialSnapshots.$inferSelect;
export type NewCompanyFinancialSnapshot =
  typeof companyFinancialSnapshots.$inferInsert;

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
export type DealOpportunityScreening =
  typeof dealOpportunityScreenings.$inferSelect;
export type NewDealOpportunityScreening =
  typeof dealOpportunityScreenings.$inferInsert;

export type UserActionLog = typeof userActionLogs.$inferSelect;
export type NewUserActionLog = typeof userActionLogs.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type DealSim = typeof dealSims.$inferSelect;
export type NewDealSim = typeof dealSims.$inferInsert;

export type CIMExtraction = typeof cimExtractions.$inferSelect;
export type NewCIMExtraction = typeof cimExtractions.$inferInsert;

export type Outreach = typeof outreach.$inferSelect;
export type NewOutreach = typeof outreach.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type Investor = typeof investors.$inferSelect;
export type NewInvestor = typeof investors.$inferInsert;
export type InvestorLead = typeof investorLeads.$inferSelect;
export type NewInvestorLead = typeof investorLeads.$inferInsert;
export type InvestorInteraction = typeof investorInteractions.$inferSelect;
export type NewInvestorInteraction = typeof investorInteractions.$inferInsert;
export type InvestorCompanyLink = typeof investorCompanyLinks.$inferSelect;
export type NewInvestorCompanyLink = typeof investorCompanyLinks.$inferInsert;
