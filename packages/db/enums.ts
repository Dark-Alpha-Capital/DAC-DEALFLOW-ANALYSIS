/**
 * Drizzle-free enum constants and types for use in browser bundles.
 * Keep in sync with pgEnum definitions in schema.ts.
 */

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
  OPERATING_PLAYBOOK: "OPERATING_PLAYBOOK",
  INVESTMENT_MEMO: "INVESTMENT_MEMO",
  IC_TEMPLATE: "IC_TEMPLATE",
  INDUSTRY_RESEARCH: "INDUSTRY_RESEARCH",
  VALUE_CREATION_PLAYBOOK: "VALUE_CREATION_PLAYBOOK",
  PAST_DEAL_ANALYSIS: "PAST_DEAL_ANALYSIS",
  DUE_DILIGENCE_CHECKLIST: "DUE_DILIGENCE_CHECKLIST",
  CIM_SCREENING: "CIM_SCREENING",
  CIM: "CIM",
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

export const ScreenerCategory = {
  DEAL_SCREENER: "Deal Screener",
  PROJECT_SCREENER: "Project Screener",
} as const;
export type ScreenerCategory =
  (typeof ScreenerCategory)[keyof typeof ScreenerCategory];
export const SCREENER_CATEGORY_VALUES = [
  "Deal Screener",
  "Project Screener",
] as const;

export const Department = {
  CAPITAL_MARKETS: "Capital Markets",
  DEAL_TEAM: "Deal Team",
  LEGAL_AND_COMPLIANCE: "Legal and Compliance",
  OPERATIONS: "Operations",
  MA_ORIGINATION: "M&A Origination",
  TECHNOLOGY: "Technology",
  INVESTOR_RELATIONS: "Investor Relations",
  PUBLIC_MARKETS_HEDGE_FUND: "Public Markets/Hedge Fund",
  INVESTMENT_TEAM: "Investment Team",
  DUE_DILIGENCE: "Due Diligence",
  TALENT_ACQUISITION: "Talent Acquisition",
  OPERATING_PARTNER: "Operating Partner",
} as const;
export type Department = (typeof Department)[keyof typeof Department];
export const DEPARTMENT_VALUES = [
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
] as const;
