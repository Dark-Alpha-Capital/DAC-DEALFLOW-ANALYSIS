import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
  callBitrix,
  callBitrixListAll,
  formatBitrixMoneyForDisplay,
  getAiBitrixFormFieldMeta,
  getBitrixDealFieldsCatalog,
  getBitrixSyncEnv,
  inferPortalBaseFromWebhook,
  mergeBitrixDealFieldRows,
  normalizeBitrixDealFieldsResult,
  normalizeBitrixDealUserfieldListItem,
  type BitrixDealFieldRow,
} from "@repo/bitrix-sync";
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

function bitrixWidgetOmitFileFieldType(fieldType: string | null | undefined): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return t.includes("file") || t.includes("disk");
}

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

async function loadBitrixDealFieldRowsForWidget(webhookBaseUrl: string | undefined): Promise<{
  rows: BitrixDealFieldRow[];
  source: "live" | "catalog";
}> {
  const catalog = getBitrixDealFieldsCatalog();
  if (!webhookBaseUrl?.trim()) {
    return { rows: catalog, source: "catalog" };
  }
  try {
    const rawFields = await callBitrix<Record<string, unknown>>(
      "crm.deal.fields",
      {},
      { webhookBaseUrl },
    );
    const fromDeal = normalizeBitrixDealFieldsResult(rawFields);
    const userfieldRows: BitrixDealFieldRow[] = [];
    try {
      const ufItems = await callBitrixListAll<Record<string, unknown>>(
        "crm.deal.userfield.list",
        { order: { ID: "ASC" } },
        { webhookBaseUrl },
      );
      for (const item of ufItems) {
        const row = normalizeBitrixDealUserfieldListItem(item);
        if (row) userfieldRows.push(row);
      }
    } catch {
      /* userfield list is optional */
    }
    return {
      rows: mergeBitrixDealFieldRows(fromDeal, userfieldRows),
      source: "live",
    };
  } catch {
    return { rows: catalog, source: "catalog" };
  }
}

function buildBitrixOpportunitySyncFieldLabelById(): Map<string, string> {
  const meta = getAiBitrixFormFieldMeta();
  const m = new Map<string, string>();
  for (const v of Object.values(meta)) {
    const id = v.bitrixFieldId?.trim();
    if (id) m.set(id, v.label);
  }
  return m;
}

function formatBitrixWidgetFieldDisplayValue(
  fieldType: string | null,
  raw: unknown,
  serialize: (v: unknown) => string,
): string {
  const t = (fieldType ?? "").toLowerCase();
  if (t === "money") {
    const formatted = formatBitrixMoneyForDisplay(raw);
    if (formatted) return formatted;
  }
  if (typeof raw === "string" && raw.includes("|")) {
    const formatted = formatBitrixMoneyForDisplay(raw);
    if (formatted) return formatted;
  }
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "VALUE" in (raw as object) &&
    ("CURRENCY" in (raw as object) || "currency" in (raw as object))
  ) {
    const formatted = formatBitrixMoneyForDisplay(raw);
    if (formatted) return formatted;
  }
  return serialize(raw);
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

  const vectorSettleMsAfterIngest = Math.min(
    Math.max(
      Number(process.env.BITRIX_WIDGET_VECTOR_SETTLE_MS ?? 12_000),
      2_000,
    ),
    300_000,
  );

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
    vectorSettleMsAfterIngest,
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
