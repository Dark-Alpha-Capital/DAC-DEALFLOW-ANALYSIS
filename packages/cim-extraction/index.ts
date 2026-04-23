import { generateText, Output } from "ai";
import {
  CIM_EXTRACTION_SYSTEM,
  CIM_EXTRACTION_USER,
  getOpenAIProvider,
} from "@repo/ai-core";
import { z } from "zod";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import * as XLSX from "xlsx";

const LOG = "[cim-extraction]";

/** WebDAV / workers may return Buffer, Uint8Array, or ArrayBuffer — avoid `view.buffer` when input is raw ArrayBuffer. */
function toUint8ArrayPdfBytes(
  input: Buffer | Uint8Array | ArrayBuffer,
): Uint8Array {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new TypeError(
    `${LOG} Expected ArrayBuffer or a typed array, got ${Object.prototype.toString.call(input)}`,
  );
}

function assertNonEmptyPdf(bytes: Uint8Array): void {
  if (bytes.length === 0) {
    throw new Error(`${LOG} PDF input is empty (0 bytes)`);
  }
  const head = new TextDecoder("latin1").decode(
    bytes.subarray(0, Math.min(2048, bytes.length)),
  );
  if (!head.includes("%PDF")) {
    const hex = [...bytes.subarray(0, 32)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    throw new Error(
      `${LOG} Response is not a PDF (no %PDF marker in first 2KB — may be HTML/XML/error body). First 32 bytes (hex)=${hex}`,
    );
  }
}

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

export async function extractTextFromPdf(
  buffer: Buffer | Uint8Array | ArrayBuffer,
): Promise<string> {
  const { text } = await extractPdfContent(buffer);
  return text;
}

export async function extractPdfContent(
  buffer: Buffer | Uint8Array | ArrayBuffer,
): Promise<{ text: string; numpages: number }> {
  const data = toUint8ArrayPdfBytes(buffer);
  console.log(`${LOG} extractPdfContent: input size=${data.byteLength} bytes`);
  assertNonEmptyPdf(data);
  try {
    const { totalPages, text: rawText } = await extractText(data, {
      mergePages: true,
    });
    const text = (typeof rawText === "string" ? rawText : "").trim();

    const numpages = totalPages ?? 0;
    console.log(
      `${LOG} extractPdfContent: ok pages=${numpages} textChars=${text.length}`,
    );
    if (numpages > 0 && text.length === 0) {
      throw new Error(
        `${LOG} PDF has ${numpages} page(s) but no extractable text (likely image-only / scanned). OCR is not enabled here.`,
      );
    }
    return { text, numpages };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "Error";
    console.error(`${LOG} extractPdfContent failed`, { name, msg, error });
    throw new Error(`Failed to extract text from PDF: ${msg}`, {
      cause: error,
    });
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  console.log(`[cim-extraction] extractTextFromDocx: input buffer size=${buffer.length}`);
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() ?? "";
    console.log(`[cim-extraction] extractTextFromDocx: extracted ${text.length} chars`);
    return text;
  } catch (error) {
    console.error("[cim-extraction] DOCX parse error:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}

export function extractTextFromExcel(buffer: Buffer): string {
  console.log(`[cim-extraction] extractTextFromExcel: input buffer size=${buffer.length}`);
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
    const chunks: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        chunks.push(`Sheet: ${sheetName}\n${csv}`);
      }
    }
    const text = chunks.join("\n\n").trim();
    console.log(`[cim-extraction] extractTextFromExcel: extracted ${text.length} chars from ${workbook.SheetNames.length} sheets`);
    return text;
  } catch (error) {
    console.error("[cim-extraction] Excel parse error:", error);
    throw new Error("Failed to extract text from Excel");
  }
}

// ============================================================================
// LLM Extraction
// ============================================================================

const openai = getOpenAIProvider();

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
