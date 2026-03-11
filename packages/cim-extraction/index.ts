import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import pdfParse from "pdf-parse";

// ============================================================================
// Schema (arrays instead of records - OpenAI rejects z.record / propertyNames)
// ============================================================================

const yearValueSchema = z.array(
  z.object({ year: z.string(), value: z.number() }),
);
const segmentPctSchema = z.array(
  z.object({ segment: z.string(), percentage: z.number() }),
);

// All properties required - OpenAI structured output requires every key in "required" array.
// Use empty arrays / null for missing data instead of .optional().
const cimExtractionOutputSchema = z.object({
  revenueHistory: yearValueSchema,
  ebitdaHistory: yearValueSchema,
  employeeCount: z.number().nullable(),
  customerConcentration: z.number().nullable(),
  capexIntensity: z.string().nullable(),
  revenueBreakdown: segmentPctSchema,
  growthDrivers: z.array(z.string()),
  keyRisks: z.array(z.string()),
  industryOverview: z.string().nullable(),
  transactionDetails: z.string().nullable(),
});

export type CIMExtractionPayload = {
  revenueHistory?: Record<string, number>;
  ebitdaHistory?: Record<string, number>;
  employeeCount?: number | null;
  customerConcentration?: number | null;
  capexIntensity?: string | null;
  revenueBreakdown?: Record<string, number>;
  growthDrivers?: string[];
  keyRisks?: string[];
  industryOverview?: string | null;
  transactionDetails?: string | null;
};

function toPayload(
  raw: z.infer<typeof cimExtractionOutputSchema>,
): CIMExtractionPayload {
  const rh = raw.revenueHistory ?? [];
  const eh = raw.ebitdaHistory ?? [];
  const rb = raw.revenueBreakdown ?? [];
  return {
    revenueHistory: rh.length ? Object.fromEntries(rh.map((r) => [r.year, r.value])) : undefined,
    ebitdaHistory: eh.length ? Object.fromEntries(eh.map((r) => [r.year, r.value])) : undefined,
    employeeCount: raw.employeeCount ?? null,
    customerConcentration: raw.customerConcentration ?? null,
    capexIntensity: raw.capexIntensity ?? null,
    revenueBreakdown: rb.length ? Object.fromEntries(rb.map((r) => [r.segment, r.percentage])) : undefined,
    growthDrivers: raw.growthDrivers?.length ? raw.growthDrivers : undefined,
    keyRisks: raw.keyRisks?.length ? raw.keyRisks : undefined,
    industryOverview: raw.industryOverview ?? null,
    transactionDetails: raw.transactionDetails ?? null,
  };
}

// ============================================================================
// PDF Text Extraction
// ============================================================================

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log(`[cim-extraction] extractTextFromPdf: input buffer size=${buffer.length}`);
  try {
    const data = await pdfParse(buffer);
    const text = data.text?.trim() ?? "";
    console.log(`[cim-extraction] extractTextFromPdf: extracted ${text.length} chars`);
    return text;
  } catch (error) {
    console.error("[cim-extraction] PDF parse error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

// ============================================================================
// LLM Extraction
// ============================================================================

const CIM_EXTRACTION_SYSTEM = `You are analyzing a Confidential Information Memorandum (CIM) for a private-company sale transaction.
Extract structured data from the document. Return only valid JSON matching the schema.
You MUST include every field. Use [] for empty arrays, null for missing scalar values.
Revenue and EBITDA should be in millions (e.g., 7.2 for $7.2M).
Years in revenueHistory/ebitdaHistory should be strings like "2021", "2022".
Revenue breakdown and customer concentration should be percentages (0-100).`;

const CIM_EXTRACTION_USER = `Extract the following from this CIM document. Return as JSON with these structures:

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

const openai = createOpenAI({
  apiKey: process.env.AI_API_KEY,
});

export async function runCIMExtractionLLM(
  rawText: string,
): Promise<CIMExtractionPayload> {
  if (!rawText || rawText.length < 100) {
    throw new Error("CIM text too short to extract meaningful data");
  }

  const truncated =
    rawText.length > 120_000 ? rawText.slice(0, 120_000) + "\n\n[Truncated...]" : rawText;
  console.log(`[cim-extraction] runCIMExtractionLLM: input ${rawText.length} chars, truncated=${rawText.length > 120_000}, sending ${truncated.length} chars`);

  console.log(`[cim-extraction] runCIMExtractionLLM: calling generateText...`);
  const { output } = await generateText({
    model: openai("gpt-4o-mini"),
    system: CIM_EXTRACTION_SYSTEM,
    prompt: `${CIM_EXTRACTION_USER}\n\n---\n\nDocument text:\n\n${truncated}`,
    output: Output.object({
      schema: cimExtractionOutputSchema,
    }),
  });

  if (!output) {
    throw new Error("CIM extraction produced no output");
  }

  console.log(`[cim-extraction] runCIMExtractionLLM: got output, converting to payload`);
  return toPayload(output);
}
