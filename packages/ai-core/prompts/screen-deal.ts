export function buildScreenDealChunkPrompt(deal: object, chunk: string): string {
  return `Evaluate this listing ${JSON.stringify(deal)} against the screener text below.

Return a terse screening note with only the strongest evidence:
- 1 sentence on fit
- up to 3 short bullets for strengths / risks
- no long paragraphs

Screener text:
${chunk}`;
}

export function buildScreenDealSummaryPrompt(combinedSummary: string): string {
  return `Combine the following screening notes into a quick decision summary.

Output requirements:
- title: short descriptive title
- score: 1-10
- sentiment: POSITIVE, NEUTRAL, or NEGATIVE
- explanation: at most 600 characters, written as 2-4 compact bullet-style sentences. Include the verdict, top evidence, and any key risk. No long paragraphs.

Screening notes:
${combinedSummary}`;
}
