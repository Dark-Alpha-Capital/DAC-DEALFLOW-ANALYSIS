export type EvidenceCitation = {
  chunkId: string;
  excerpt: string;
  pageNumber: number | null;
};

export type ChunkEvidenceRow = {
  id: string;
  chunkText: string | null;
  pageNumber: number | null;
};

/** Map stored evidence chunk IDs to excerpts (order preserved; missing DB rows still listed). */
export function mapEvidenceChunkIdsToCitations(
  ids: string[] | null | undefined,
  chunkRows: ChunkEvidenceRow[],
): EvidenceCitation[] {
  if (!ids?.length) return [];
  const byId = new Map(chunkRows.map((c) => [c.id, c]));
  return ids.map((chunkId) => {
    const row = byId.get(chunkId);
    return {
      chunkId,
      excerpt: row?.chunkText?.trim() ?? "",
      pageNumber: row?.pageNumber ?? null,
    };
  });
}
