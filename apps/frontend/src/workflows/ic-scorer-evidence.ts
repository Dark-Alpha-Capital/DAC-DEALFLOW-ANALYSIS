import type { AppDb } from "@repo/db";
import { and, asc, eq } from "@repo/db";
import { documentChunks } from "@repo/db/schema";
import type { IcScorerEvidenceExcerpt } from "@repo/ai-core";
import { listDealOpportunityScreeningChunks } from "@/lib/document-chunk-vectorize";

export function icScorerRagChunkLimit(): number {
  const raw = process.env.IC_SCORER_RAG_CHUNK_LIMIT?.trim();
  if (!raw) return 18;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 18;
  return Math.min(100, Math.max(1, n));
}

function icScorerMonographMaxChars(): number {

  const raw =
    process.env.IC_SCORER_MONOGRAPH_MAX_CHARS?.trim() ??
    process.env.CIM_MONOGRAPH_MAX_CHARS?.trim();
  if (!raw) return 120_000;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 10_000) return 120_000;
  return Math.min(500_000, n);
}

function buildMonographExcerptBlocks(
  chunks: Array<{ id: string; chunkText: string | null }>,
  maxChars: number,
): { excerpts: IcScorerEvidenceExcerpt[]; chunkIds: string[] } {
  const valid = chunks
    .filter((c) => c.chunkText && c.chunkText.trim().length > 0)
    .map((c) => ({ id: c.id, text: c.chunkText!.trim() }));
  if (valid.length === 0) {
    return {
      excerpts: [
        {
          label: "Monograph document",
          text: "No text excerpts were retrieved for this document.",
        },
      ],
      chunkIds: [],
    };
  }

  const excerpts: IcScorerEvidenceExcerpt[] = [];
  const chunkIds: string[] = [];
  let used = 0;
  for (let i = 0; i < valid.length; i++) {
    const chunk = valid[i]!;
    const prefix = `[Excerpt ${i + 1}]\n`;
    const body = chunk.text;
    const blockText = `${prefix}${body}`;
    const cost = (excerpts.length > 0 ? 2 : 0) + blockText.length;
    if (used + cost > maxChars) {
      excerpts.push({
        label: "Note",
        text: "[Document context truncated to fit prompt budget]",
      });
      break;
    }
    excerpts.push({
      label: `Monograph excerpt ${i + 1}`,
      chunkId: chunk.id,
      text: blockText,
    });
    chunkIds.push(chunk.id);
    used += cost;
  }
  return { excerpts, chunkIds };
}

export async function loadIcScorerEvidence(input: {
  db: AppDb;
  dealOpportunityId: string;
  mode: "rag" | "monograph";
  targetDocumentId?: string;
}): Promise<{ excerpts: IcScorerEvidenceExcerpt[]; chunkIds: string[] }> {
  if (input.mode === "monograph") {
    const docId = input.targetDocumentId?.trim();
    if (!docId) {
      throw new Error("IC scorer monograph mode requires targetDocumentId");
    }
    const rows = await input.db
      .select({
        id: documentChunks.id,
        chunkText: documentChunks.chunkText,
      })
      .from(documentChunks)
      .where(
        and(
          eq(documentChunks.dealOpportunityId, input.dealOpportunityId),
          eq(documentChunks.documentId, docId),
        ),
      )
      .orderBy(asc(documentChunks.createdAt));
    return buildMonographExcerptBlocks(rows, icScorerMonographMaxChars());
  }

  const limit = icScorerRagChunkLimit();
  const chunks = await listDealOpportunityScreeningChunks(
    input.db,
    input.dealOpportunityId,
    limit,
  );
  const excerpts: IcScorerEvidenceExcerpt[] = chunks.map((c, i) => ({
    label: `Deal index excerpt ${i + 1}`,
    chunkId: c.id,
    documentId: c.documentId,
    text: (c.chunkText ?? "").trim(),
  }));
  const chunkIds = chunks.map((c) => c.id);
  return { excerpts, chunkIds };
}
