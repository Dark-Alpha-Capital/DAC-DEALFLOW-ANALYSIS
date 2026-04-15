export function buildCimScreeningQuestionPrompt(params: {
  question: string;
  excerpts: string;
  /** CRM / deal-opportunity listing fields (e.g. Bitrix title, teaser, revenue) — not a substitute for document evidence. */
  dealListingContext?: string | null;
}): string {
  const listing = params.dealListingContext?.trim();
  const listingBlock = listing
    ? `Deal listing context (synced CRM fields — use for orientation; for claims about document content, rely on excerpts below; if CRM and excerpts conflict, prefer excerpts):
---
${listing}
---

`
    : "";

  return `${listingBlock}You are screening a confidential information memorandum (CIM). Ground your score primarily in the document excerpts below. You may use the listing context above only to interpret names, scale, or labels. If the excerpts do not contain enough information, state that explicitly and use a conservative score.

Excerpts from the document:
---
${params.excerpts}
---

Screening question:
${params.question}

Respond with a score from 0–10 (10 = evidence in the excerpts strongly supports a positive answer; 0 = clear negative or no usable evidence) and a concise rationale. Reference which excerpt supports the answer when possible.`;
}
