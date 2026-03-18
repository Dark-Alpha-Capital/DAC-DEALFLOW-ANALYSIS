import { z } from "zod";
import db, {
  and,
  companies,
  dealOpportunities,
  desc,
  documentChunks,
  documents,
  eq,
  ilike,
  inArray,
  isNull,
  or,
} from "@repo/db";
import { getEmbedding } from "@repo/rag-engine";
import { SearchDocumentChunks } from "@repo/db/queries";

type ChatContext = {
  companyId?: string | null;
  leadId?: string | null;
  dealOpportunityId?: string | null;
};

type EvidenceItem = {
  chunkId: string;
  documentId: string;
  entityType: "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY" | "THEME" | "GLOBAL";
  entityId: string | null;
  dealOpportunityId: string | null;
  companyId: string | null;
  pageNumber: number | null;
  snippet: string | null;
  sourceRank: number;
  retrievalMethod: "vector" | "keyword";
  title: string | null;
  fileName: string | null;
  category: string | null;
};

const DEFAULT_EVIDENCE_LIMIT = 12;
const MAX_EVIDENCE_LIMIT = 25;
const SNIPPET_LENGTH = 500;

const requiredDueDiligenceCategories = [
  "FINANCIALS",
  "LEGAL",
  "TAX",
  "COMMERCIAL",
  "OPERATIONS",
  "PROSPECTUS",
] as const;

export const diligenceScopeInputSchema = z.object({
  dealOpportunityId: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  query: z.string().trim().optional(),
});

export const retrieveDiligenceEvidenceInputSchema = z.object({
  question: z.string().trim().min(1),
  scope: diligenceScopeInputSchema.optional(),
  limit: z.number().int().min(1).max(MAX_EVIDENCE_LIMIT).default(DEFAULT_EVIDENCE_LIMIT),
  includeKeywordFallback: z.boolean().default(true),
  includeFullChunkText: z.boolean().default(false),
});

export const compareDiligenceEvidenceInputSchema = z.object({
  question: z.string().trim().min(1).optional(),
  scope: diligenceScopeInputSchema.optional(),
  evidence: z
    .array(
      z.object({
        chunkId: z.string(),
        documentId: z.string(),
        snippet: z.string().nullable(),
        title: z.string().nullable().optional(),
        fileName: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

export const runDiligenceChecksInputSchema = z.object({
  question: z.string().trim().optional(),
  scope: diligenceScopeInputSchema.optional(),
  evidence: z
    .array(
      z.object({
        chunkId: z.string(),
        documentId: z.string(),
        snippet: z.string().nullable(),
      }),
    )
    .optional(),
});

export const summarizeDiligenceFindingsInputSchema = z.object({
  question: z.string().trim().optional(),
  findings: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        confidence: z.number().min(0).max(1),
        fact: z.string(),
        inference: z.string(),
        recommendedFollowUp: z.string(),
      }),
    )
    .default([]),
  discrepancies: z
    .array(
      z.object({
        metric: z.string(),
        values: z.array(z.string()),
        severity: z.enum(["low", "medium", "high"]),
        chunkIds: z.array(z.string()),
      }),
    )
    .default([]),
  coverage: z
    .object({
      requiredCategories: z.array(z.string()),
      presentCategories: z.array(z.string()),
      missingCategories: z.array(z.string()),
    })
    .optional(),
  sources: z
    .array(
      z.object({
        chunkId: z.string(),
        documentId: z.string(),
        snippet: z.string().nullable(),
      }),
    )
    .default([]),
});

function buildBasePrompt() {
  return [
    "You are Dark Alpha Capital's deal and investor assistant.",
    "Your PRIMARY focus is: deal sourcing and deal screening (finding and evaluating acquisition opportunities), investor lead sourcing and high net worth individual (HNWI) sourcing, and lead generation for the capital CRM.",
    "Your SECONDARY focus is due diligence: document-grounded analysis, risk discovery, discrepancy detection, and evidence-based findings.",
    "Always prioritize tool-based evidence over assumptions. Separate facts from inferences explicitly.",
  ].join(" ");
}

function buildProtocolPrompt() {
  return [
    "When helping users:",
    "1) For investors/leads: Use listEntities (entity: investors or investorLeads), getEntityById, getEntityCounts to show investor pipeline, HNWIs, and lead status.",
    "2) For deals: Use getDealOpportunityDossier, listEntities (entity: dealOpportunities), getEntityCounts for deal sourcing and screening.",
    "3) For diligence: Resolve scope, retrieve evidence, compare facts, run checks, return findings with citations.",
  ].join(" ");
}

function buildEvidencePrompt() {
  return [
    "For diligence answers: Use citation references (documentId/chunkId).",
    "Do not make definitive claims without supporting snippets.",
    "If uncertain, state uncertainty and suggest follow-ups.",
  ].join(" ");
}

export function buildDiligenceSystemPrompt() {
  return `${buildBasePrompt()} ${buildProtocolPrompt()} ${buildEvidencePrompt()}`;
}

function normalizeSnippet(value: string | null, includeFullChunkText: boolean) {
  if (value == null) return null;
  if (includeFullChunkText) return value;
  if (value.length <= SNIPPET_LENGTH) return value;
  return `${value.slice(0, SNIPPET_LENGTH)}...`;
}

function tokenizeQuestion(question: string) {
  return question
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 8);
}

function parseFinancialClaims(evidence: Array<{ chunkId: string; snippet: string | null }>) {
  const claims: Array<{
    metric: "revenue" | "ebitda" | "margin";
    rawValue: string;
    chunkId: string;
  }> = [];

  const revenueRegex = /\brevenue\b[^0-9$%]*([$]?\s?\d[\d,.]*(?:\s?(?:m|mm|million|b|bn|billion))?)/gi;
  const ebitdaRegex = /\bebitda\b[^0-9$%]*([$]?\s?\d[\d,.]*(?:\s?(?:m|mm|million|b|bn|billion))?)/gi;
  const marginRegex = /\b(?:ebitda margin|margin)\b[^0-9$%]*(\d{1,3}(?:\.\d+)?%)/gi;

  for (const item of evidence) {
    const text = (item.snippet ?? "").toLowerCase();
    if (!text) continue;

    for (const match of text.matchAll(revenueRegex)) {
      claims.push({ metric: "revenue", rawValue: match[1] ?? "", chunkId: item.chunkId });
    }
    for (const match of text.matchAll(ebitdaRegex)) {
      claims.push({ metric: "ebitda", rawValue: match[1] ?? "", chunkId: item.chunkId });
    }
    for (const match of text.matchAll(marginRegex)) {
      claims.push({ metric: "margin", rawValue: match[1] ?? "", chunkId: item.chunkId });
    }
  }

  return claims;
}

async function resolveDiligenceScopeInternal(
  input: z.infer<typeof diligenceScopeInputSchema> | undefined,
  context: ChatContext,
) {
  if (input?.dealOpportunityId) {
    const [opp] = await db
      .select({
        id: dealOpportunities.id,
        companyId: dealOpportunities.companyId,
      })
      .from(dealOpportunities)
      .where(eq(dealOpportunities.id, input.dealOpportunityId))
      .limit(1);

    return {
      dealOpportunityId: opp?.id ?? null,
      companyId: input.companyId ?? opp?.companyId ?? null,
      source: "input" as const,
      candidates: [],
    };
  }

  if (context.dealOpportunityId) {
    const [opp] = await db
      .select({
        id: dealOpportunities.id,
        companyId: dealOpportunities.companyId,
      })
      .from(dealOpportunities)
      .where(eq(dealOpportunities.id, context.dealOpportunityId))
      .limit(1);

    return {
      dealOpportunityId: opp?.id ?? context.dealOpportunityId,
      companyId: context.companyId ?? opp?.companyId ?? null,
      source: "context" as const,
      candidates: [],
    };
  }

  if (input?.companyId || context.companyId) {
    return {
      dealOpportunityId: null,
      companyId: input?.companyId ?? context.companyId ?? null,
      source: "company-context" as const,
      candidates: [],
    };
  }

  if (!input?.query) {
    return {
      dealOpportunityId: null,
      companyId: null,
      source: "none" as const,
      candidates: [],
    };
  }

  const term = `%${input.query}%`;
  const candidates = await db
    .select({
      dealOpportunityId: dealOpportunities.id,
      companyId: dealOpportunities.companyId,
      companyName: companies.name,
      dealTeaser: dealOpportunities.dealTeaser,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(
      and(
        isNull(companies.deletedAt),
        or(
          ilike(companies.name, term),
          ilike(dealOpportunities.dealTeaser, term),
          ilike(dealOpportunities.brokerage, term),
        )!,
      ),
    )
    .orderBy(desc(dealOpportunities.updatedAt), desc(dealOpportunities.id))
    .limit(5);

  if (candidates.length === 1) {
    return {
      dealOpportunityId: candidates[0]?.dealOpportunityId ?? null,
      companyId: candidates[0]?.companyId ?? null,
      source: "query-match" as const,
      candidates,
    };
  }

  return {
    dealOpportunityId: null,
    companyId: null,
    source: "query-ambiguous" as const,
    candidates,
  };
}

export async function resolveDiligenceScope(
  input: z.infer<typeof diligenceScopeInputSchema> | undefined,
  context: ChatContext,
) {
  const scope = await resolveDiligenceScopeInternal(input, context);

  if (!scope.dealOpportunityId && !scope.companyId) {
    return {
      summary:
        scope.candidates.length > 1
          ? "Multiple possible diligence targets found. Ask the user to pick one."
          : "No diligence scope resolved. Ask the user to select a deal or company context.",
      data: scope,
      meta: {
        requiresDisambiguation: scope.candidates.length > 1,
      },
    };
  }

  return {
    summary: "Resolved due diligence scope.",
    data: scope,
    meta: {
      requiresDisambiguation: false,
    },
  };
}

async function getDocumentMetadataMap(documentIds: string[]) {
  if (documentIds.length === 0) {
    return new Map<string, { title: string | null; fileName: string | null; category: string | null }>();
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      category: documents.category,
    })
    .from(documents)
    .where(inArray(documents.id, documentIds));

  return new Map(
    rows.map((row) => [
      row.id,
      {
        title: row.title ?? null,
        fileName: row.fileName ?? null,
        category: row.category ?? null,
      },
    ]),
  );
}

async function retrieveKeywordFallbackEvidence(
  question: string,
  scope: { dealOpportunityId: string | null; companyId: string | null },
  limit: number,
) {
  const terms = tokenizeQuestion(question);
  if (terms.length === 0) return [];

  const termConditions = terms.map((term) => ilike(documentChunks.chunkText, `%${term}%`));
  const scopeConditions = [];
  if (scope.dealOpportunityId) {
    scopeConditions.push(eq(documentChunks.dealOpportunityId, scope.dealOpportunityId));
  }
  if (scope.companyId) {
    scopeConditions.push(eq(documentChunks.companyId, scope.companyId));
  }

  const whereClause = and(
    ...scopeConditions,
    or(...termConditions)!,
  );

  return db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      entityType: documentChunks.entityType,
      entityId: documentChunks.entityId,
      dealOpportunityId: documentChunks.dealOpportunityId,
      companyId: documentChunks.companyId,
      pageNumber: documentChunks.pageNumber,
      chunkText: documentChunks.chunkText,
    })
    .from(documentChunks)
    .where(whereClause)
    .orderBy(desc(documentChunks.createdAt))
    .limit(limit);
}

export async function retrieveDiligenceEvidence(
  input: z.infer<typeof retrieveDiligenceEvidenceInputSchema>,
  context: ChatContext,
) {
  const scope = await resolveDiligenceScopeInternal(input.scope, context);
  if (!scope.dealOpportunityId && !scope.companyId) {
    return {
      summary:
        scope.candidates.length > 1
          ? "Unable to retrieve evidence because scope is ambiguous."
          : "Unable to retrieve evidence because scope is missing.",
      data: {
        scope,
        evidence: [],
      },
      meta: {
        requiresDisambiguation: scope.candidates.length > 1,
      },
    };
  }

  const limit = Math.min(input.limit, MAX_EVIDENCE_LIMIT);
  const embedding = await getEmbedding(input.question);
  const vectorRows =
    embedding && embedding.length > 0
      ? await SearchDocumentChunks({
        queryEmbedding: embedding,
        limit: limit * 2,
        dealOpportunityId: scope.dealOpportunityId ?? undefined,
        companyId: scope.companyId ?? undefined,
      })
      : [];

  const keywordRows = input.includeKeywordFallback
    ? await retrieveKeywordFallbackEvidence(input.question, scope, limit)
    : [];

  const vectorEvidence = vectorRows.map((row, index) => ({
    chunkId: row.id,
    documentId: row.documentId,
    entityType: row.entityType,
    entityId: row.entityId,
    dealOpportunityId: row.dealOpportunityId,
    companyId: row.companyId,
    pageNumber: row.pageNumber,
    snippet: normalizeSnippet(row.chunkText, input.includeFullChunkText),
    sourceRank: index + 1,
    retrievalMethod: "vector" as const,
  }));

  const keywordEvidence = keywordRows.map((row, index) => ({
    chunkId: row.id,
    documentId: row.documentId,
    entityType: row.entityType,
    entityId: row.entityId,
    dealOpportunityId: row.dealOpportunityId,
    companyId: row.companyId,
    pageNumber: row.pageNumber,
    snippet: normalizeSnippet(row.chunkText, input.includeFullChunkText),
    sourceRank: index + 1,
    retrievalMethod: "keyword" as const,
  }));

  const deduped = new Map<string, Omit<EvidenceItem, "title" | "fileName" | "category">>();
  for (const item of [...vectorEvidence, ...keywordEvidence]) {
    if (!deduped.has(item.chunkId)) {
      deduped.set(item.chunkId, item);
    }
    if (deduped.size >= limit) break;
  }

  const dedupedEvidence = [...deduped.values()];
  const metadataMap = await getDocumentMetadataMap(
    dedupedEvidence.map((item) => item.documentId),
  );

  const evidence: EvidenceItem[] = dedupedEvidence.map((item) => {
    const meta = metadataMap.get(item.documentId);
    return {
      ...item,
      title: meta?.title ?? null,
      fileName: meta?.fileName ?? null,
      category: meta?.category ?? null,
    };
  });

  return {
    summary: `Retrieved ${evidence.length} evidence chunks for due diligence.`,
    data: {
      scope,
      evidence,
    },
    meta: {
      evidenceCount: evidence.length,
      vectorCount: vectorEvidence.length,
      keywordCount: keywordEvidence.length,
      includeKeywordFallback: input.includeKeywordFallback,
      includeFullChunkText: input.includeFullChunkText,
    },
  };
}

function detectDiscrepanciesFromEvidence(evidence: Array<{ chunkId: string; snippet: string | null }>) {
  const claims = parseFinancialClaims(evidence);
  const byMetric = new Map<string, Array<{ rawValue: string; chunkId: string }>>();

  for (const claim of claims) {
    const arr = byMetric.get(claim.metric) ?? [];
    arr.push({ rawValue: claim.rawValue.trim(), chunkId: claim.chunkId });
    byMetric.set(claim.metric, arr);
  }

  const discrepancies: Array<{
    metric: string;
    values: string[];
    severity: "low" | "medium" | "high";
    chunkIds: string[];
  }> = [];

  for (const [metric, values] of byMetric.entries()) {
    const uniqueValues = [...new Set(values.map((value) => value.rawValue).filter(Boolean))];
    if (uniqueValues.length <= 1) continue;

    discrepancies.push({
      metric,
      values: uniqueValues,
      severity: uniqueValues.length >= 3 ? "high" : "medium",
      chunkIds: [...new Set(values.map((value) => value.chunkId))],
    });
  }

  return discrepancies;
}

export async function compareDiligenceEvidence(
  input: z.infer<typeof compareDiligenceEvidenceInputSchema>,
  context: ChatContext,
) {
  const evidenceFromInput =
    input.evidence?.map((item) => ({
      chunkId: item.chunkId,
      documentId: item.documentId,
      snippet: item.snippet ?? null,
    })) ?? [];

  let evidence = evidenceFromInput;
  let scopeData:
    | {
      dealOpportunityId: string | null;
      companyId: string | null;
    }
    | undefined;

  if (evidence.length === 0 && input.question) {
    const retrieval = await retrieveDiligenceEvidence(
      {
        question: input.question,
        scope: input.scope,
        limit: DEFAULT_EVIDENCE_LIMIT,
        includeKeywordFallback: true,
        includeFullChunkText: false,
      },
      context,
    );
    scopeData = retrieval.data.scope;
    evidence = retrieval.data.evidence.map((item) => ({
      chunkId: item.chunkId,
      documentId: item.documentId,
      snippet: item.snippet,
    }));
  }

  if (evidence.length === 0) {
    return {
      summary: "No evidence available to compare.",
      data: {
        discrepancies: [],
        comparedEvidenceCount: 0,
      },
      meta: {},
    };
  }

  const discrepancies = detectDiscrepanciesFromEvidence(evidence);

  return {
    summary:
      discrepancies.length > 0
        ? `Detected ${discrepancies.length} potential cross-document discrepancies.`
        : "No clear numeric discrepancies detected in retrieved evidence.",
    data: {
      scope: scopeData ?? null,
      discrepancies,
      comparedEvidenceCount: evidence.length,
    },
    meta: {
      discrepancyCount: discrepancies.length,
    },
  };
}

export async function runDiligenceChecks(
  input: z.infer<typeof runDiligenceChecksInputSchema>,
  context: ChatContext,
) {
  const scope = await resolveDiligenceScopeInternal(input.scope, context);
  if (!scope.dealOpportunityId && !scope.companyId) {
    return {
      summary: "Cannot run diligence checks without a resolved scope.",
      data: {
        findings: [],
        discrepancies: [],
        coverage: null,
        sources: [],
      },
      meta: {
        requiresDisambiguation: scope.candidates.length > 1,
      },
    };
  }

  const evidenceResult =
    input.evidence && input.evidence.length > 0
      ? {
        evidence: input.evidence.map((item, index) => ({
          chunkId: item.chunkId,
          documentId: item.documentId,
          entityType: "DEAL_OPPORTUNITY" as const,
          entityId: null,
          dealOpportunityId: scope.dealOpportunityId,
          companyId: scope.companyId,
          pageNumber: null,
          snippet: item.snippet ?? null,
          sourceRank: index + 1,
          retrievalMethod: "vector" as const,
          title: null,
          fileName: null,
          category: null,
        })),
      }
      : await retrieveDiligenceEvidence(
        {
          question:
            input.question ??
            "Perform due diligence checks for discrepancies, risk, and missing documentation.",
          scope: input.scope,
          limit: DEFAULT_EVIDENCE_LIMIT,
          includeKeywordFallback: true,
          includeFullChunkText: false,
        },
        context,
      ).then((response) => response.data);

  const discrepancies = detectDiscrepanciesFromEvidence(evidenceResult.evidence);

  const docConditions = [];
  if (scope.dealOpportunityId) {
    docConditions.push(eq(documents.dealOpportunityId, scope.dealOpportunityId));
  }
  if (scope.companyId) {
    docConditions.push(eq(documents.companyId, scope.companyId));
  }

  const scopedDocuments =
    docConditions.length > 0
      ? await db
        .select({
          id: documents.id,
          category: documents.category,
        })
        .from(documents)
        .where(or(...docConditions)!)
      : [];

  const presentCategories = [...new Set(scopedDocuments.map((doc) => doc.category))];
  const missingCategories = requiredDueDiligenceCategories.filter(
    (category) => !presentCategories.includes(category),
  );

  const findings = [
    ...(discrepancies.length > 0
      ? [
        {
          title: "Potential cross-document financial inconsistency",
          severity: discrepancies.some((item) => item.severity === "high")
            ? ("high" as const)
            : ("medium" as const),
          confidence: 0.72,
          fact: `Detected ${discrepancies.length} discrepancy group(s) across retrieved evidence.`,
          inference:
            "At least one core financial metric appears inconsistent across documents.",
          recommendedFollowUp:
            "Reconcile values against the latest management-approved financial source.",
        },
      ]
      : [
        {
          title: "No obvious numeric discrepancy in sampled evidence",
          severity: "low" as const,
          confidence: 0.55,
          fact:
            "No conflicting numeric revenue/EBITDA/margin values were detected in sampled snippets.",
          inference:
            "Either documents are consistent or additional targeted retrieval is needed.",
          recommendedFollowUp:
            "Run targeted checks by metric (revenue bridge, EBITDA normalization, margin assumptions).",
        },
      ]),
    ...(missingCategories.length > 0
      ? [
        {
          title: "Document coverage gaps",
          severity: missingCategories.length >= 3 ? ("high" as const) : ("medium" as const),
          confidence: 0.9,
          fact: `Missing categories: ${missingCategories.join(", ")}`,
          inference:
            "Current evidence set is incomplete for full diligence confidence.",
          recommendedFollowUp:
            "Upload or map missing diligence artifacts before final recommendation.",
        },
      ]
      : []),
  ];

  const sources = evidenceResult.evidence.map((item) => ({
    chunkId: item.chunkId,
    documentId: item.documentId,
    snippet: item.snippet,
    retrievalMethod: item.retrievalMethod,
  }));

  return {
    summary: "Completed due diligence checks with evidence and coverage analysis.",
    data: {
      scope,
      findings,
      discrepancies,
      coverage: {
        requiredCategories: [...requiredDueDiligenceCategories],
        presentCategories,
        missingCategories,
      },
      sources,
    },
    meta: {
      evidenceCount: evidenceResult.evidence.length,
      discrepancyCount: discrepancies.length,
      missingCategoryCount: missingCategories.length,
    },
  };
}

export async function summarizeDiligenceFindings(
  input: z.infer<typeof summarizeDiligenceFindingsInputSchema>,
) {
  const topSeverity = input.findings.some((item) => item.severity === "high")
    ? "high"
    : input.findings.some((item) => item.severity === "medium")
      ? "medium"
      : "low";

  const confidence =
    input.findings.length > 0
      ? Number(
        (
          input.findings.reduce((sum, item) => sum + item.confidence, 0) /
          input.findings.length
        ).toFixed(2),
      )
      : 0;

  const recommendation =
    topSeverity === "high"
      ? "Escalate for analyst review before progressing the opportunity."
      : topSeverity === "medium"
        ? "Proceed with caution and resolve flagged gaps before decision."
        : "No material blocker detected in current evidence set.";

  return {
    summary: "Generated diligence report summary.",
    data: {
      executiveSummary: {
        question:
          input.question ??
          "Due diligence summary generated from tool outputs.",
        topSeverity,
        confidence,
        recommendation,
      },
      findings: input.findings,
      discrepancies: input.discrepancies,
      coverage: input.coverage ?? null,
      sources: input.sources,
    },
    meta: {
      findingCount: input.findings.length,
      discrepancyCount: input.discrepancies.length,
      sourceCount: input.sources.length,
    },
  };
}
