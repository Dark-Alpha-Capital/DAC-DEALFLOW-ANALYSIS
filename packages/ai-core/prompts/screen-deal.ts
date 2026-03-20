export function buildScreenDealChunkPrompt(deal: object, chunk: string): string {
  return `Evaluate this listing ${JSON.stringify(deal)}: ${chunk}`;
}

export function buildScreenDealSummaryPrompt(combinedSummary: string): string {
  return `Combine the following summaries into a single summary: ${combinedSummary}`;
}
