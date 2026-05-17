import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { callBitrix, getBitrixSyncEnv, inferPortalBaseFromWebhook } from "@repo/bitrix-sync";
import {
  bitrixWidgetOmitFileFieldType,
  buildBitrixOpportunitySyncFieldLabelById,
  formatBitrixWidgetFieldDisplayValue,
  loadBitrixDealFieldRowsForWidget,
} from "@/lib/server/bitrix-widget-deal-snapshot";
import {
  GetDealOpportunityById,
  countDocumentChunksByDealOpportunityId,
  getAllScreeners,
  getCimScreeningAnswersWithQuestionsByRunId,
  getDocumentChunksByIds,
  listActiveIngestionPipelineJobsForDeal,
  listCimScreeningRunsForDealOpportunity,
  listDealOpportunityDocumentsSummary,
} from "@repo/db/queries";
import db, { workflowJobs, and as drizzleAnd, desc, eq, inArray } from "@repo/db";
import { mapEvidenceChunkIdsToCitations } from "@/lib/map-cim-screening-evidence";
import { bitrixScreeningWidgetBootstrapSchema } from "@/lib/zod-schemas/deals-router";
import {
  assertValidBitrixWidgetContext,
  resolveDealOpportunityForBitrixDeal,
} from "@/lib/server/bitrix-widget-deal-resolve";
import { fetchBitrixWidgetLinkedEntities } from "@/lib/server/bitrix-widget-linked-entities";

export type BitrixScreeningWidgetBootstrapInput = z.infer<
  typeof bitrixScreeningWidgetBootstrapSchema
>;

function parseDealDocumentsSnapshot(raw: unknown): Array<{
  id: string;
  fileName: string;
  contentHash: string | null;
}> {
  if (raw == null || typeof raw !== "object") return [];
  const docs = (raw as { documents?: unknown }).documents;
  if (!Array.isArray(docs)) return [];
  const out: Array<{ id: string; fileName: string; contentHash: string | null }> = [];
  for (const d of docs) {
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id) continue;
    out.push({
      id,
      fileName: typeof o.fileName === "string" ? o.fileName : id,
      contentHash: typeof o.contentHash === "string" ? o.contentHash : null,
    });
  }
  return out;
}

async function bitrixScreeningWidgetBootstrapPayload(
  input: BitrixScreeningWidgetBootstrapInput,
) {
  await assertValidBitrixWidgetContext(input);
  const env = getBitrixSyncEnv();
  const dealOpportunityId = await resolveDealOpportunityForBitrixDeal(
    input.dealId,
  );

  const [screeners, latestRunRows, activeJobs, appOpp] = await Promise.all([
    getAllScreeners(),
    listCimScreeningRunsForDealOpportunity(dealOpportunityId),
    db
      .select({
        instanceId: workflowJobs.instanceId,
        state: workflowJobs.state,
        screenerId: workflowJobs.screenerId,
        updatedAt: workflowJobs.updatedAt,
      })
      .from(workflowJobs)
      .where(
        drizzleAnd(
          inArray(workflowJobs.workflowKind, [
            "cim-screening",
            "cim-monograph-screening",
          ]),
          eq(workflowJobs.dealId, dealOpportunityId),
          inArray(workflowJobs.state, ["waiting", "active", "delayed"]),
        ),
      )
      .orderBy(desc(workflowJobs.updatedAt)),
    GetDealOpportunityById(dealOpportunityId),
  ]);

  const bitrixStr = (v: unknown) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
  };

  let bitrixDeal: {
    id: string;
    title: string | null;
    stageId: string | null;
    amount: string | null;
  } | null = null;
  let bitrixDealFields: Array<{
    key: string;
    label: string;
    type: string | null;
    value: string;
  }> = [];
  let bitrixFieldLabelSource: "live" | "catalog" | "none" = "none";
  let bitrixLinkedEntities: Awaited<
    ReturnType<typeof fetchBitrixWidgetLinkedEntities>
  > | null = null;

  const portalBaseForUi =
    env?.portalBaseUrl?.trim() ||
    (env?.webhookBaseUrl
      ? inferPortalBaseFromWebhook(env.webhookBaseUrl)
      : "");

  const serializeBitrixValue = (value: unknown): string => {
    if (value == null || value === "") return "—";
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const webhookOpts = env?.webhookBaseUrl
    ? { webhookBaseUrl: env.webhookBaseUrl }
    : undefined;

  try {
    const [{ rows: fieldRows, source: labelSource }, rawDeal] =
      await Promise.all([
        loadBitrixDealFieldRowsForWidget(env?.webhookBaseUrl),
        callBitrix<Record<string, unknown>>(
          "crm.deal.get",
          { id: input.dealId },
          webhookOpts,
        ),
      ]);

    bitrixFieldLabelSource = labelSource;
    const fieldMetaById = new Map(
      fieldRows.map((r) => [r.fieldId, r] as const),
    );
    const opportunitySyncLabels = buildBitrixOpportunitySyncFieldLabelById();

    bitrixDeal = {
      id: input.dealId,
      title: bitrixStr(rawDeal?.TITLE),
      stageId: bitrixStr(rawDeal?.STAGE_ID),
      amount: bitrixStr(rawDeal?.OPPORTUNITY),
    };
    bitrixDealFields = Object.entries(rawDeal ?? {})
      .filter(([k]) => k !== "undefined")
      .filter(([key]) => !bitrixWidgetOmitFileFieldType(fieldMetaById.get(key)?.type))
      .map(([key, value]) => {
        const meta = fieldMetaById.get(key);
        const portalTitle = meta?.title?.trim() ?? "";
        const label =
          opportunitySyncLabels.get(key) ??
          (portalTitle && portalTitle !== key ? portalTitle : key);
        const fieldType = meta?.type ?? null;
        return {
          key,
          label,
          type: fieldType,
          value: formatBitrixWidgetFieldDisplayValue(
            fieldType,
            value,
            serializeBitrixValue,
          ),
        };
      })
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label, undefined, {
            sensitivity: "base",
          }) || a.key.localeCompare(b.key),
      );

    if (webhookOpts?.webhookBaseUrl) {
      bitrixLinkedEntities = await fetchBitrixWidgetLinkedEntities(
        rawDeal,
        webhookOpts,
      );
    }
  } catch (error) {
    console.warn("[bitrix-screen-widget] failed to fetch Bitrix deal", {
      bitrixDealId: input.dealId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const [indexedCount, dealDocuments, ingestionPipelineJobs] =
    await Promise.all([
      countDocumentChunksByDealOpportunityId(dealOpportunityId),
      listDealOpportunityDocumentsSummary(dealOpportunityId),
      listActiveIngestionPipelineJobsForDeal(dealOpportunityId),
    ]);

  const latestRun = latestRunRows[0] ?? null;
  const lastRunAnswers = latestRun
    ? await getCimScreeningAnswersWithQuestionsByRunId(latestRun.runId)
    : [];

  const evidenceChunkIdsForRun = lastRunAnswers.flatMap(
    (a) => a.evidenceChunkIds ?? [],
  );
  const evidenceChunkRows =
    evidenceChunkIdsForRun.length > 0
      ? await getDocumentChunksByIds(evidenceChunkIdsForRun)
      : [];

  return {
    dealOpportunityId,
    webhookConfigured: Boolean(env?.webhookBaseUrl),
    portalBaseUrl: portalBaseForUi,
    bitrixDealId: input.dealId,
    bitrixDeal,
    bitrixFieldLabelSource,
    bitrixDealFields,
    bitrixLinkedContact: bitrixLinkedEntities?.contact ?? null,
    bitrixLinkedCompany: bitrixLinkedEntities?.company ?? null,
    appDeal: {
      id: dealOpportunityId,
      title: appOpp?.title ?? null,
      stage: appOpp?.stage ?? null,
    },
    dealDocuments,
    ingestionPipelineJobs,
    indexedCount,
    recentScreeningRuns: latestRunRows.slice(0, 20).map((r) => ({
      runId: r.runId,
      sessionId: r.sessionId,
      status: r.status,
      screenerName: r.screenerName,
      createdAt: r.runCreatedAt,
      errorMessage: r.errorMessage,
      documentsAtRun: parseDealDocumentsSnapshot(r.dealDocumentsSnapshot),
    })),
    screeners: (screeners ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      questionCount: s.questionCount,
    })),
    lastRun: latestRun
      ? {
        runId: latestRun.runId,
        status: latestRun.status,
        errorMessage: latestRun.errorMessage,
        screenerId: latestRun.screenerId,
        screenerName: latestRun.screenerName,
        createdAt: latestRun.runCreatedAt,
        answers: lastRunAnswers.map((a) => ({
          questionId: a.questionId,
          position: a.position,
          question: a.questionText,
          score: a.score,
          rationale: a.rationale,
          evidenceChunkIds: a.evidenceChunkIds ?? [],
          evidenceCitations: mapEvidenceChunkIdsToCitations(
            a.evidenceChunkIds ?? null,
            evidenceChunkRows,
          ),
        })),
      }
      : null,
    activeJobs,
  };
}

export type BitrixScreeningWidgetBootstrapPayload = Awaited<
  ReturnType<typeof bitrixScreeningWidgetBootstrapPayload>
>;

/**
 * GET server function: full Bitrix screening widget bootstrap (replaces tRPC query).
 */
export const loadBitrixScreeningWidgetBootstrapData = createServerFn({
  method: "GET",
})
  .inputValidator((raw: unknown) => bitrixScreeningWidgetBootstrapSchema.parse(raw))
  .handler(async ({ data }) => bitrixScreeningWidgetBootstrapPayload(data));
