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
