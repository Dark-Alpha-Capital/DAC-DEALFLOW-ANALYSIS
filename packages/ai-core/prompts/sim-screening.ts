export function buildSimScreeningQuestionPrompt(params: {
  question: string;
  excerpts: string;
}): string {
  return `You are screening a confidential information memorandum (SIM/CIM). Answer ONLY using the excerpts below. If the excerpts do not contain enough information, state that explicitly and use a conservative score.

Excerpts from the document:
---
${params.excerpts}
---

Screening question:
${params.question}

Respond with a score from 0–10 (10 = evidence in the excerpts strongly supports a positive answer; 0 = clear negative or no usable evidence) and a concise rationale. Reference which excerpt supports the answer when possible.`;
}
