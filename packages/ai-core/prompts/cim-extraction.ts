export const CIM_EXTRACTION_SYSTEM = `You are analyzing a Confidential Information Memorandum (CIM) for a private-company sale transaction.
Extract structured data from the document. Return only valid JSON matching the schema.
You MUST include every field. Use [] for empty arrays, null for missing scalar values.
Revenue and EBITDA should be in millions (e.g., 7.2 for $7.2M).
Years in revenueHistory/ebitdaHistory should be strings like "2021", "2022".
Revenue breakdown and customer concentration should be percentages (0-100).`;

export const CIM_EXTRACTION_USER = `Extract the following from this CIM document. Return as JSON with these structures:

1. revenueHistory: Array of {year: string, value: number} - revenue in millions per year, e.g. [{year: "2021", value: 5.8}, {year: "2022", value: 6.6}]
2. ebitdaHistory: Array of {year: string, value: number} - EBITDA in millions per year
3. employeeCount: Total employee count (number or null)
4. customerConcentration: Top customer % of revenue (number 0-100 or null)
5. capexIntensity: "LOW", "MEDIUM", "HIGH", or null
6. revenueBreakdown: Array of {segment: string, percentage: number} - segment name and % of revenue, e.g. [{segment: "Medical Billing", percentage: 70}]
7. growthDrivers: Array of growth opportunity strings
8. keyRisks: Array of key risk strings
9. industryOverview: Brief industry description or null
10. transactionDetails: Transaction-specific details or null`;
