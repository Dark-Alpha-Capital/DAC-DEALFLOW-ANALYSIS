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
  check,
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
  "CIM_SCREENING",
  "CIM",
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

export const dealCimStatusEnum = pgEnum("DealCimStatus", [
  "ACTIVE",
  "ARCHIVED",
]);

export const cimScreeningSessionStatusEnum = pgEnum(
  "CimScreeningSessionStatus",
  ["PENDING", "INGESTING", "SCREENING", "COMPLETED", "FAILED"],
);

export const icScorerRunStatusEnum = pgEnum("IcScorerRunStatus", [
  "PENDING",
  "SCORING",
  "MEMO",
  "COMPLETED",
  "FAILED",
]);

export const icScorerModeEnum = pgEnum("IcScorerMode", ["rag", "monograph"]);

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

export const screenerCategoryEnum = pgEnum("ScreenerCategory", [
  "Deal Screener",
  "Project Screener",
]);
export type ScreenerCategoryValue =
  (typeof screenerCategoryEnum.enumValues)[number];

export const projectTrackerSourceTypeEnum = pgEnum("ProjectTrackerSourceType", [
  "PROJECT_KICKOFF",
]);

export const projectKickoffScreeningStatusEnum = pgEnum(
  "ProjectKickoffScreeningStatus",
  ["pending", "running", "completed", "failed"],
);

export const departmentEnum = pgEnum("Department", [
  "Capital Markets",
  "Deal Team",
  "Legal and Compliance",
  "Operations",
  "M&A Origination",
  "Technology",
  "Investor Relations",
  "Public Markets/Hedge Fund",
  "Investment Team",
  "Due Diligence",
  "Talent Acquisition",
  "Operating Partner",
]);
export type DepartmentValue = (typeof departmentEnum.enumValues)[number];

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

export const dealOpportunities = pgTable(
  "DealOpportunity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),

    // Relationships (optional: attach company later or link multiple opps to one company)
    companyId: text("companyId").references(() => companies.id, {
      onDelete: "cascade",
    }),

    leadId: text("leadId").references(() => leads.id, { onDelete: "set null" }),

    legacyDealId: text("legacyDealId")
      .references(() => deals.id, { onDelete: "set null" })
      .unique(),

    // Deal-specific metadata
    sourceWebsite: text("sourceWebsite"),
    /** Listing / target location (e.g. Bitrix State + Company Address). */
    companyLocation: text("companyLocation"),
    cimLink: text("cimLink"),
    dataRoomLink: text("dataRoomLink"),
    brokerage: text("brokerage"),

    // Financial snapshot at listing time
    revenue: doublePrecision("revenue"),
    ebitda: doublePrecision("ebitda"),
    ebitdaMargin: doublePrecision("ebitdaMargin"),

    askingPrice: doublePrecision("askingPrice"),
    impliedMultiple: doublePrecision("impliedMultiple"),

    /** Bitrix deal TITLE / listing headline */
    title: text("title"),
    dealTeaser: text("dealTeaser"),
    description: text("description"),

    dealType: dealTypeEnum("dealType").default("MANUAL").notNull(),
    /** Bitrix24 CRM deal kanban `STAGE_ID` for the configured pipeline (`BITRIX_DEAL_STAGES_JSON` / `getBitrixDealStages`). */
    stage: text("stage").notNull().default("NEW"),
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
    dealOppBitrixIdUniqueIdx: uniqueIndex("deal_opp_bitrix_id_unique_idx")
      .on(table.bitrixId)
      .where(sql`${table.bitrixId} is not null`),
  }),
);

/** Many-to-many: deal opportunities linked to companies (primary/secondary targets). */
export const dealOpportunityCompanyLinks = pgTable(
  "DealOpportunityCompanyLink",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    companyId: text("companyId")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    dealOppCompanyLinkUniqueIdx: uniqueIndex("deal_opp_company_link_unique_idx")
      .on(table.dealOpportunityId, table.companyId),
    dealOppCompanyLinkDealIdx: index("deal_opp_company_link_deal_idx").on(
      table.dealOpportunityId,
    ),
    dealOppCompanyLinkCompanyIdx: index("deal_opp_company_link_company_idx").on(
      table.companyId,
    ),
  }),
);

export const dealOpportunityThemes = pgTable(
  "DealOpportunityTheme",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    themeId: text("themeId")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    isPrimary: boolean("isPrimary").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    dealOppThemeUniqueIdx: uniqueIndex("deal_opp_theme_unique_idx").on(
      table.dealOpportunityId,
      table.themeId,
    ),
    dealOppThemeDealIdx: index("deal_opp_theme_deal_idx").on(
      table.dealOpportunityId,
    ),
    dealOppThemeThemeIdx: index("deal_opp_theme_theme_idx").on(table.themeId),
    dealOppPrimaryThemeUniqueIdx: uniqueIndex("deal_opp_primary_theme_unique_idx")
      .on(table.dealOpportunityId)
      .where(sql`${table.isPrimary} = true`),
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
    category: screenerCategoryEnum("category").notNull().default("Deal Screener"),
    description: text("description"),
    content: text("content"),
    department: departmentEnum("department"),
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

export const leadScreenings = pgTable(
  "LeadScreening",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    leadId: text("leadId")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
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
    leadScreeningLeadUniqueIdx: uniqueIndex("lead_screening_lead_unique_idx").on(
      table.leadId,
    ),
    leadScreeningStatusIdx: index("lead_screening_status_idx").on(table.status),
    leadScreeningScoreIdx: index("lead_screening_score_idx").on(table.score),
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

export const documents = pgTable(
  "Document",
  {
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
    contentHash: text("contentHash"),
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
  },
  (table) => ({
    documentCompanyContentHashUniqueIdx: uniqueIndex(
      "document_company_content_hash_unique_idx",
    )
      .on(table.companyId, table.contentHash)
      .where(
        sql`${table.companyId} IS NOT NULL AND ${table.contentHash} IS NOT NULL`,
      ),
    documentLeadContentHashUniqueIdx: uniqueIndex(
      "document_lead_content_hash_unique_idx",
    )
      .on(table.leadId, table.contentHash)
      .where(
        sql`${table.leadId} IS NOT NULL AND ${table.contentHash} IS NOT NULL`,
      ),
    documentDealOppContentHashUniqueIdx: uniqueIndex(
      "document_deal_opp_content_hash_unique_idx",
    )
      .on(table.dealOpportunityId, table.contentHash)
      .where(
        sql`${table.dealOpportunityId} IS NOT NULL AND ${table.contentHash} IS NOT NULL`,
      ),
    documentThemeContentHashUniqueIdx: uniqueIndex(
      "document_theme_content_hash_unique_idx",
    )
      .on(table.themeId, table.contentHash)
      .where(
        sql`${table.themeId} IS NOT NULL AND ${table.contentHash} IS NOT NULL`,
      ),
    documentGlobalContentHashUniqueIdx: uniqueIndex(
      "document_global_content_hash_unique_idx",
    )
      .on(table.contentHash)
      .where(
        sql`${table.entityType} = 'GLOBAL' AND ${table.contentHash} IS NOT NULL`,
      ),
  }),
);

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

/** Tracks Cloudflare Workflow instances for job list / progress in the app UI */
export const workflowJobs = pgTable(
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
    /** UI state: waiting | active | completed | failed | delayed */
    state: text("state").notNull().default("waiting"),
    failedReason: text("failedReason"),
    returnValue: jsonb("returnValue"),
    attemptsMade: integer("attemptsMade").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    workflowJobUserCreatedIdx: index("workflow_job_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

/** Stores saved project kickoff form data */
export const projectKickoffs = pgTable(
  "ProjectKickoff",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectName: text("projectName").notNull(),
    department: departmentEnum("department"),
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
    /** Original paste from step 1 — preserved for reference */
    rawText: text("rawText"),
    /** Structured extraction shape (arrays/objects preserved) */
    structuredData: jsonb("structuredData"),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
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

/** AI screening runs for a project kickoff (history + current) */
export const projectKickoffScreenings = pgTable(
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
    status: projectKickoffScreeningStatusEnum("status")
      .notNull()
      .default("pending"),
    score: doublePrecision("score"),
    analysis: text("analysis"),
    screenedAt: timestamp("screenedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
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

/** Registry of all projects across types — one row per project, populated on save */
export const projectTrackers = pgTable(
  "ProjectTracker",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    sourceType: projectTrackerSourceTypeEnum("sourceType")
      .notNull()
      .default("PROJECT_KICKOFF"),
    kickoffId: text("kickoffId")
      .notNull()
      .references(() => projectKickoffs.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
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

export type ProjectTracker = typeof projectTrackers.$inferSelect;
export type NewProjectTracker = typeof projectTrackers.$inferInsert;

export type ProjectKickoffScreening =
  typeof projectKickoffScreenings.$inferSelect;
export type NewProjectKickoffScreening =
  typeof projectKickoffScreenings.$inferInsert;

/**
 * Bitrix CRM file attachment → app Document + RAG (widget auto-ingest).
 * Keyed by Bitrix deal id + disk file id (not internal deal opportunity id alone).
 */
export const bitrixWidgetDealFiles = pgTable(
  "BitrixWidgetDealFile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bitrixDealId: text("bitrixDealId").notNull(),
    bitrixFieldId: text("bitrixFieldId").notNull(),
    bitrixDiskFileId: text("bitrixDiskFileId").notNull(),
    displayName: text("displayName"),
    documentId: text("documentId").references(() => documents.id, {
      onDelete: "set null",
    }),
    contentHash: text("contentHash"),
    /** pending | syncing | processed | failed */
    status: text("status").notNull().default("pending"),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    bitrixWidgetDealFileUniq: uniqueIndex("bitrix_widget_deal_file_uniq").on(
      table.bitrixDealId,
      table.bitrixDiskFileId,
    ),
    bitrixWidgetDealFileDealIdx: index("bitrix_widget_deal_file_deal_idx").on(
      table.bitrixDealId,
    ),
  }),
);

/** CIM template screening: one uploaded CIM PDF per session, or a deal opportunity (multi-doc RAG); runs hold per-template executions */
export const cimScreeningSessions = pgTable(
  "CimScreeningSession",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    documentId: text("documentId").references(() => documents.id, {
      onDelete: "cascade",
    }),
    dealOpportunityId: text("dealOpportunityId").references(
      () => dealOpportunities.id,
      { onDelete: "cascade" },
    ),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    cimScreeningSessionUserIdx: index("cim_screening_session_user_idx").on(
      table.userId,
    ),
    cimScreeningSessionDocumentIdx: index(
      "cim_screening_session_document_idx",
    ).on(table.documentId),
    cimScreeningSessionDealOppIdx: index(
      "cim_screening_session_deal_opp_idx",
    ).on(table.dealOpportunityId),
    cimScreeningSessionScopeCheck: check(
      "cim_screening_session_scope_check",
      sql`(${table.documentId} IS NOT NULL AND ${table.dealOpportunityId} IS NULL) OR (${table.documentId} IS NULL AND ${table.dealOpportunityId} IS NOT NULL)`,
    ),
  }),
);

/** One screening execution: screener template + workflow job + answers */
export const cimScreeningRuns = pgTable(
  "CimScreeningRun",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    sessionId: text("sessionId")
      .notNull()
      .references(() => cimScreeningSessions.id, { onDelete: "cascade" }),
    screenerId: text("screenerId")
      .notNull()
      .references(() => screenerTemplates.id, { onDelete: "cascade" }),
    workflowInstanceId: text("workflowInstanceId"),
    status: cimScreeningSessionStatusEnum("status")
      .default("PENDING")
      .notNull(),
    errorMessage: text("errorMessage"),
    /** Snapshot of deal documents (ids + names) at run start for Bitrix widget history */
    dealDocumentsSnapshot: jsonb("dealDocumentsSnapshot"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    cimScreeningRunSessionIdx: index("cim_screening_run_session_idx").on(
      table.sessionId,
    ),
  }),
);

export const cimScreeningAnswers = pgTable(
  "CimScreeningAnswer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    runId: text("runId")
      .notNull()
      .references(() => cimScreeningRuns.id, { onDelete: "cascade" }),
    questionId: text("questionId")
      .notNull()
      .references(() => screenerQuestions.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    rationale: text("rationale").notNull(),
    evidenceChunkIds: jsonb("evidenceChunkIds").$type<string[]>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    cimScreeningAnswerRunQuestionUnique: uniqueIndex(
      "cim_screening_answer_run_question_unique",
    ).on(table.runId, table.questionId),
    cimScreeningAnswerRunIdx: index("cim_screening_answer_run_idx").on(
      table.runId,
    ),
  }),
);

/**
 * IC Readiness scorer runs: one row per scoring attempt for a Bitrix deal.
 * Holds the structured score payload + final memo output so past runs are replayable from history.
 */
export const icScorerRuns = pgTable(
  "IcScorerRun",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId").references(() => users.id, {
      onDelete: "set null",
    }),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    bitrixDealId: text("bitrixDealId"),
    mode: icScorerModeEnum("mode").notNull(),
    targetDocumentId: text("targetDocumentId").references(() => documents.id, {
      onDelete: "set null",
    }),
    status: icScorerRunStatusEnum("status").default("PENDING").notNull(),
    errorMessage: text("errorMessage"),
    scoreWorkflowInstanceId: text("scoreWorkflowInstanceId"),
    memoWorkflowInstanceId: text("memoWorkflowInstanceId"),
    /** Score core produced by the score workflow; nullable until the score step completes. */
    scorePayload: jsonb("scorePayload"),
    /** Full IC scorer payload (score + structured `memo`); nullable until the run completes. */
    output: jsonb("output"),
    /** Snapshot of deal documents (ids + names) at run start for history display. */
    dealDocumentsSnapshot: jsonb("dealDocumentsSnapshot"),
    evidenceChunkIds: jsonb("evidenceChunkIds").$type<string[]>(),
    promptVersion: text("promptVersion"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    icScorerRunDealOppIdx: index("ic_scorer_run_deal_opp_idx").on(
      table.dealOpportunityId,
      table.createdAt,
    ),
    icScorerRunUserIdx: index("ic_scorer_run_user_idx").on(table.userId),
    icScorerRunBitrixDealIdx: index("ic_scorer_run_bitrix_deal_idx").on(
      table.bitrixDealId,
    ),
  }),
);

/**
 * Deal CIM uploads — one active per deal opportunity.
 * Latest upload becomes active; previous is archived.
 */
export const dealCims = pgTable(
  "DealCim",
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
    status: dealCimStatusEnum("status").default("ACTIVE").notNull(),
    uploadedById: text("uploadedById").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  },
  (table) => ({
    dealCimDealOppIdx: index("deal_cim_deal_opp_idx").on(
      table.dealOpportunityId,
    ),
    dealCimActiveUniqueIdx: uniqueIndex("deal_cim_active_unique_idx")
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
    dealCimId: text("dealCimId").references(() => dealCims.id, {
      onDelete: "cascade",
    }),
    documentId: text("documentId").references(() => documents.id, {
      onDelete: "cascade",
    }), // Denormalized; primary link is dealCimId
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
    cimExtractionDealCimIdx: index("cim_extraction_deal_cim_idx").on(
      table.dealCimId,
    ),
    cimExtractionDealCimUniqueIdx: uniqueIndex(
      "cim_extraction_deal_cim_unique_idx",
    ).on(table.dealCimId),
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

/** Many-to-many: investors linked directly to deal opportunities. */
export const investorDealOpportunityLinks = pgTable(
  "InvestorDealOpportunityLink",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    investorId: text("investorId")
      .notNull()
      .references(() => investors.id, { onDelete: "cascade" }),
    dealOpportunityId: text("dealOpportunityId")
      .notNull()
      .references(() => dealOpportunities.id, { onDelete: "cascade" }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    investorDealLinkUniqueIdx: uniqueIndex("investor_deal_link_unique_idx").on(
      table.investorId,
      table.dealOpportunityId,
    ),
    investorDealLinkInvestorIdx: index("investor_deal_link_investor_idx").on(
      table.investorId,
    ),
    investorDealLinkDealIdx: index("investor_deal_link_deal_idx").on(
      table.dealOpportunityId,
    ),
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
  cimScreeningSessions: many(cimScreeningSessions),
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
  dealOpportunities: many(dealOpportunityThemes),
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
  deterministicScreening: one(leadScreenings, {
    fields: [leads.id],
    references: [leadScreenings.leadId],
  }),
}));

export const leadScreeningsRelations = relations(leadScreenings, ({ one }) => ({
  lead: one(leads, {
    fields: [leadScreenings.leadId],
    references: [leads.id],
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
    dealCims: many(dealCims),
    cimScreeningSessions: many(cimScreeningSessions),
    companyLinks: many(dealOpportunityCompanyLinks),
    themes: many(dealOpportunityThemes),
    investorLinks: many(investorDealOpportunityLinks),
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
  dealOpportunityLinks: many(dealOpportunityCompanyLinks),
}));

export const dealOpportunityThemesRelations = relations(
  dealOpportunityThemes,
  ({ one }) => ({
    dealOpportunity: one(dealOpportunities, {
      fields: [dealOpportunityThemes.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
    theme: one(themes, {
      fields: [dealOpportunityThemes.themeId],
      references: [themes.id],
    }),
  }),
);

export const dealOpportunityCompanyLinksRelations = relations(
  dealOpportunityCompanyLinks,
  ({ one }) => ({
    dealOpportunity: one(dealOpportunities, {
      fields: [dealOpportunityCompanyLinks.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
    company: one(companies, {
      fields: [dealOpportunityCompanyLinks.companyId],
      references: [companies.id],
    }),
  }),
);

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
  cimScreeningRuns: many(cimScreeningRuns),
}));

export const screenerQuestionsRelations = relations(
  screenerQuestions,
  ({ one, many }) => ({
    screener: one(screeners, {
      fields: [screenerQuestions.screenerId],
      references: [screeners.id],
    }),
    responses: many(screenerResponses),
    cimScreeningAnswers: many(cimScreeningAnswers),
  }),
);

export const cimScreeningSessionsRelations = relations(
  cimScreeningSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [cimScreeningSessions.userId],
      references: [users.id],
    }),
    document: one(documents, {
      fields: [cimScreeningSessions.documentId],
      references: [documents.id],
    }),
    dealOpportunity: one(dealOpportunities, {
      fields: [cimScreeningSessions.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
    runs: many(cimScreeningRuns),
  }),
);

export const cimScreeningRunsRelations = relations(
  cimScreeningRuns,
  ({ one, many }) => ({
    session: one(cimScreeningSessions, {
      fields: [cimScreeningRuns.sessionId],
      references: [cimScreeningSessions.id],
    }),
    screener: one(screeners, {
      fields: [cimScreeningRuns.screenerId],
      references: [screeners.id],
    }),
    answers: many(cimScreeningAnswers),
  }),
);

export const cimScreeningAnswersRelations = relations(
  cimScreeningAnswers,
  ({ one }) => ({
    run: one(cimScreeningRuns, {
      fields: [cimScreeningAnswers.runId],
      references: [cimScreeningRuns.id],
    }),
    question: one(screenerQuestions, {
      fields: [cimScreeningAnswers.questionId],
      references: [screenerQuestions.id],
    }),
  }),
);

export const icScorerRunsRelations = relations(icScorerRuns, ({ one }) => ({
  user: one(users, {
    fields: [icScorerRuns.userId],
    references: [users.id],
  }),
  dealOpportunity: one(dealOpportunities, {
    fields: [icScorerRuns.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
  targetDocument: one(documents, {
    fields: [icScorerRuns.targetDocumentId],
    references: [documents.id],
  }),
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
  cimScreeningSessions: many(cimScreeningSessions),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const dealCimsRelations = relations(dealCims, ({ one, many }) => ({
  dealOpportunity: one(dealOpportunities, {
    fields: [dealCims.dealOpportunityId],
    references: [dealOpportunities.id],
  }),
  document: one(documents, {
    fields: [dealCims.documentId],
    references: [documents.id],
  }),
  uploadedBy: one(users, {
    fields: [dealCims.uploadedById],
    references: [users.id],
  }),
  cimExtractions: many(cimExtractions),
}));

export const cimExtractionsRelations = relations(cimExtractions, ({ one }) => ({
  dealCim: one(dealCims, {
    fields: [cimExtractions.dealCimId],
    references: [dealCims.id],
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
  dealOpportunityLinks: many(investorDealOpportunityLinks),
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

export const investorDealOpportunityLinksRelations = relations(
  investorDealOpportunityLinks,
  ({ one }) => ({
    investor: one(investors, {
      fields: [investorDealOpportunityLinks.investorId],
      references: [investors.id],
    }),
    dealOpportunity: one(dealOpportunities, {
      fields: [investorDealOpportunityLinks.dealOpportunityId],
      references: [dealOpportunities.id],
    }),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================
// Enum constants and types: import from `@repo/db/enums` (browser-safe) or
// re-exported from `@repo/db` root. Not defined here so `schema.ts` stays
// server-only when imported without the package entry.

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
export type DealOpportunityCompanyLink =
  typeof dealOpportunityCompanyLinks.$inferSelect;
export type NewDealOpportunityCompanyLink =
  typeof dealOpportunityCompanyLinks.$inferInsert;
export type DealOpportunityTheme = typeof dealOpportunityThemes.$inferSelect;
export type NewDealOpportunityTheme = typeof dealOpportunityThemes.$inferInsert;
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
export type LeadScreening = typeof leadScreenings.$inferSelect;
export type NewLeadScreening = typeof leadScreenings.$inferInsert;

export type UserActionLog = typeof userActionLogs.$inferSelect;
export type NewUserActionLog = typeof userActionLogs.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

export type DealCim = typeof dealCims.$inferSelect;
export type NewDealCim = typeof dealCims.$inferInsert;

export type CIMExtraction = typeof cimExtractions.$inferSelect;
export type NewCIMExtraction = typeof cimExtractions.$inferInsert;

export type CimScreeningSession = typeof cimScreeningSessions.$inferSelect;
export type NewCimScreeningSession = typeof cimScreeningSessions.$inferInsert;
export type CimScreeningRun = typeof cimScreeningRuns.$inferSelect;
export type NewCimScreeningRun = typeof cimScreeningRuns.$inferInsert;
export type CimScreeningAnswer = typeof cimScreeningAnswers.$inferSelect;
export type NewCimScreeningAnswer = typeof cimScreeningAnswers.$inferInsert;
export type IcScorerRun = typeof icScorerRuns.$inferSelect;
export type NewIcScorerRun = typeof icScorerRuns.$inferInsert;

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
export type InvestorDealOpportunityLink =
  typeof investorDealOpportunityLinks.$inferSelect;
export type NewInvestorDealOpportunityLink =
  typeof investorDealOpportunityLinks.$inferInsert;

export type WorkflowJob = typeof workflowJobs.$inferSelect;
export type NewWorkflowJob = typeof workflowJobs.$inferInsert;

export type ProjectKickoff = typeof projectKickoffs.$inferSelect;
export type NewProjectKickoff = typeof projectKickoffs.$inferInsert;
