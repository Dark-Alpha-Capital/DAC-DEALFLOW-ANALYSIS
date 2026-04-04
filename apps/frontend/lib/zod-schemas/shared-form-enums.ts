/** Shared string-literal enums used by company / deal quick-add and related forms. */

export const COVERAGE_STATUSES = [
  "UNCONTACTED",
  "CONTACTED",
  "IN_DISCUSSION",
  "UNDER_LOI",
  "CLOSED",
  "PASSED",
] as const;

export const GROWTH_LEVER_OPTIONS = [
  "upsell_existing_clients",
  "managed_services_expansion",
  "AI_services",
  "salesforce_scale",
] as const;

export const THEME_STATUSES = ["ACTIVE", "PAUSED", "RETIRED"] as const;

export const INVESTOR_TYPES = ["HNWI", "FAMILY_OFFICE", "INSTITUTION"] as const;

export const INVESTOR_STATUSES = [
  "PROSPECT",
  "QUALIFIED",
  "ACTIVE",
  "INACTIVE",
] as const;

export const RISK_PROFILES = [
  "CONSERVATIVE",
  "MODERATE",
  "BALANCED",
  "GROWTH",
  "AGGRESSIVE",
] as const;

export const INVESTOR_LEAD_STATUSES = [
  "RAW",
  "CONTACTED",
  "ENGAGED",
  "QUALIFIED",
  "REJECTED",
] as const;
