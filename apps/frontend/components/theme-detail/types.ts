import type { Theme, Thesis, IndustryIntelligence, ThemePerformance } from "@repo/db";

export const COVERAGE_STATUSES = [
  "UNCONTACTED",
  "CONTACTED",
  "IN_DISCUSSION",
  "UNDER_LOI",
  "CLOSED",
  "PASSED",
] as const;

export type CoverageRow = {
  id: string;
  companyId: string;
  companyName: string | null;
  companyIndustry: string | null;
  companyLocation: string | null;
  coverageStatus: (typeof COVERAGE_STATUSES)[number];
  lastOutreachAt: Date | null;
  notes: string | null;
};

export type ThemeCompany = {
  id: string;
  name: string;
  industry: string | null;
  location: string | null;
};

export type ThemeDetailTabProps = {
  theme: Theme;
  companyCount: number;
  dealOpportunityCount: number;
  activeThesis: Thesis | null;
  thesisHistory: Thesis[];
  activeIndustryIntelligence: IndustryIntelligence | null;
  industryIntelligenceHistory: IndustryIntelligence[];
  latestPerformance: ThemePerformance | null;
  performanceHistory: ThemePerformance[];
  coverage: CoverageRow[];
  companies: ThemeCompany[];
};
