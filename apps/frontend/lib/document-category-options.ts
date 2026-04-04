import type { DocumentCategory } from "@repo/db/enums";

export const DOCUMENT_CATEGORY_OPTIONS: {
  value: DocumentCategory;
  label: string;
}[] = [
  { value: "FINANCIALS", label: "Financials" },
  { value: "LEGAL", label: "Legal" },
  { value: "TAX", label: "Tax" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "ESG", label: "ESG" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "INVESTOR_RELATIONSHIPS", label: "Investor relationships" },
  { value: "TOOLS", label: "Tools" },
  { value: "LEGISLATION", label: "Legislation" },
  { value: "RESEARCH", label: "Research" },
  { value: "PROSPECTUS", label: "Prospectus" },
  { value: "OTHER", label: "Other" },
  { value: "OPERATING_PLAYBOOK", label: "Operating playbook" },
  { value: "INVESTMENT_MEMO", label: "Investment memo" },
  { value: "IC_TEMPLATE", label: "IC template" },
  { value: "INDUSTRY_RESEARCH", label: "Industry research" },
  { value: "VALUE_CREATION_PLAYBOOK", label: "Value creation playbook" },
  { value: "PAST_DEAL_ANALYSIS", label: "Past deal analysis" },
  { value: "DUE_DILIGENCE_CHECKLIST", label: "Due diligence checklist" },
  { value: "SIM_SCREENING", label: "SIM screening" },
  { value: "CIM", label: "CIM" },
];
