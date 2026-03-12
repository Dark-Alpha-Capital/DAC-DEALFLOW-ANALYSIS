import type { Job } from "bullmq";
import { getEmbedding, isValidEmbeddingDimension } from "@repo/rag-engine";
import { extractTextFromDocx, extractTextFromExcel } from "@repo/cim-extraction";
import { splitContentIntoChunks } from "../utils";
import type { ChunkRow, DocumentContext, MetadataBase, ProcessResult } from "./types";
import { EXCEL, MIME, TEXT_LIKE, getMediaModality, isMedia } from "./mime";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;

function buildChunkRow(
  doc: DocumentContext,
  metadata: MetadataBase,
  opts: {
    chunkText: string | null;
    modality: "TEXT" | "PDF" | "IMAGE" | "AUDIO" | "VIDEO";
    embedding: number[];
    chunkIndex?: number;
    totalChunks?: number;
  }
): ChunkRow {
  return {
    documentId: doc.id,
    entityType: doc.entityType,
    entityId: doc.entityId,
    dealOpportunityId: doc.dealOpportunityId,
    companyId: doc.companyId,
    themeId: doc.themeId,
    chunkText: opts.chunkText,
    modality: opts.modality,
    embedding: opts.embedding,
    metadata:
      opts.chunkIndex !== undefined && opts.totalChunks !== undefined
        ? { ...metadata, chunkIndex: opts.chunkIndex, totalChunks: opts.totalChunks }
        : metadata,
  };
}

async function processTextChunks(
  text: string,
  doc: DocumentContext,
  metadata: MetadataBase,
  job: Job,
  stepLabel: string
): Promise<ChunkRow[]> {
  await job.updateProgress({ step: stepLabel, percentage: 40 });
  const chunks = await splitContentIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);
  console.log("[rag-ingestion] Text chunking", { textLength: text.length, chunksCount: chunks.length });

  const rows: ChunkRow[] = [];
  for (const [index, chunkText] of chunks.entries()) {
    if (!chunkText.trim()) continue;
    const embedding = await getEmbedding(chunkText);
    if (!isValidEmbeddingDimension(embedding)) continue;
    rows.push(
      buildChunkRow(doc, metadata, {
        chunkText,
        modality: "TEXT",
        embedding,
        chunkIndex: index,
        totalChunks: chunks.length,
      })
    );
  }
  return rows;
}

async function processInlineBinary(
  fileBuffer: Buffer,
  mimeType: string,
  modality: "PDF" | "IMAGE" | "AUDIO" | "VIDEO",
  doc: DocumentContext,
  metadata: MetadataBase,
  job: Job,
  stepLabel: string
): Promise<ChunkRow[]> {
  await job.updateProgress({ step: stepLabel, percentage: 40 });
  const embedding = await getEmbedding([
    { inlineData: { data: fileBuffer.toString("base64"), mimeType } },
  ]);
  if (!isValidEmbeddingDimension(embedding)) {
    console.log(`[rag-ingestion] ${modality} embedding invalid dimension`);
    return [];
  }
  console.log(`[rag-ingestion] ${modality} embedding OK`);
  return [
    buildChunkRow(doc, metadata, { chunkText: null, modality, embedding }),
  ];
}

export async function processContent(
  fileBuffer: Buffer,
  mimeType: string,
  doc: DocumentContext,
  metadata: MetadataBase,
  job: Job
): Promise<ProcessResult> {
  if (mimeType === MIME.PDF) {
    const chunks = await processInlineBinary(
      fileBuffer,
      MIME.PDF,
      "PDF",
      doc,
      metadata,
      job,
      "Embedding PDF"
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

  if (isMedia(mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "audio/mpeg" | "audio/wav" | "audio/ogg" | "video/mp4" | "video/webm")) {
    const modality = getMediaModality(mimeType);
    console.log("[rag-ingestion] Embedding media", { mimeType });
    const chunks = await processInlineBinary(
      fileBuffer,
      mimeType,
      modality,
      doc,
      metadata,
      job,
      "Embedding media content"
    );
    return { chunks };
  }

  return { unsupported: true, reason: `Unsupported mime type: ${mimeType}` };
}
