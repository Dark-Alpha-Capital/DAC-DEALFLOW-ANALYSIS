import { createId } from "@paralleldrive/cuid2";
import { getEmbedding } from "./embedding";
import { extractPdfContent, extractTextFromDocx, extractTextFromExcel } from "@repo/cim-extraction";
import { splitContentIntoChunks } from "./chunking";
import type {
  DocumentChunkInsert,
  DocumentContext,
  MetadataBase,
  ProcessedChunk,
  ProcessResult,
  ProgressReporter,
} from "./ingestion-types";
import { EXCEL, MIME, TEXT_LIKE } from "./mime";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

function buildProcessedChunk(
  doc: DocumentContext,
  metadata: MetadataBase,
  opts: {
    chunkText: string | null;
    modality: "TEXT" | "PDF";
    embedding: number[];
    chunkIndex?: number;
    totalChunks?: number;
  },
): ProcessedChunk {
  const row: DocumentChunkInsert = {
    id: createId(),
    documentId: doc.id,
    entityType: doc.entityType,
    entityId: doc.entityId,
    dealOpportunityId: doc.dealOpportunityId,
    companyId: doc.companyId,
    themeId: doc.themeId,
    chunkText: opts.chunkText,
    modality: opts.modality,
    metadata:
      opts.chunkIndex !== undefined && opts.totalChunks !== undefined
        ? { ...metadata, chunkIndex: opts.chunkIndex, totalChunks: opts.totalChunks }
        : metadata,
  };
  return { row, embedding: opts.embedding };
}

async function processTextChunks(
  text: string,
  doc: DocumentContext,
  metadata: MetadataBase,
  job: ProgressReporter,
  stepLabel: string,
): Promise<ProcessedChunk[]> {
  await job.updateProgress({ step: stepLabel, percentage: 40 });
  const chunks = await splitContentIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);
  console.log("[rag-ingestion] Text chunking", { textLength: text.length, chunksCount: chunks.length });

  const rows: ProcessedChunk[] = [];
  for (const [index, chunkText] of chunks.entries()) {
    if (!chunkText.trim()) continue;
    const embedding = await getEmbedding(chunkText);
    if (!embedding?.length) continue;
    rows.push(
      buildProcessedChunk(doc, metadata, {
        chunkText,
        modality: "TEXT",
        embedding,
        chunkIndex: index,
        totalChunks: chunks.length,
      }),
    );
  }
  return rows;
}

export async function processContent(
  fileBuffer: Buffer,
  mimeType: string,
  doc: DocumentContext,
  metadata: MetadataBase,
  job: ProgressReporter,
): Promise<ProcessResult> {
  if (mimeType === MIME.PDF) {
    const { text, numpages } = await extractPdfContent(fileBuffer);
    if (numpages > 6) {
      console.log("[rag-ingestion] PDF >6 pages, using text extraction path", {
        numpages,
      });
    }
    const chunks = await processTextChunks(
      text,
      doc,
      metadata,
      job,
      "Embedding PDF (text-extracted)",
    );
    return { chunks };
  }

  if (mimeType === MIME.DOCX) {
    console.log("[rag-ingestion] Extracting and embedding DOCX");
    const text = await extractTextFromDocx(fileBuffer);
    const chunks = await processTextChunks(text, doc, metadata, job, "Extracting DOCX text");
    return { chunks };
  }

  if (EXCEL.has(mimeType as "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/vnd.ms-excel")) {
    console.log("[rag-ingestion] Extracting and embedding Excel");
    const text = extractTextFromExcel(fileBuffer);
    const chunks = await processTextChunks(text, doc, metadata, job, "Extracting Excel text");
    return { chunks };
  }

  if (TEXT_LIKE.has(mimeType as "text/plain" | "text/csv" | "application/json")) {
    const text = fileBuffer.toString("utf-8");
    const chunks = await processTextChunks(text, doc, metadata, job, "Chunking text content");
    return { chunks };
  }

  return { unsupported: true, reason: `Unsupported mime type: ${mimeType}` };
}
