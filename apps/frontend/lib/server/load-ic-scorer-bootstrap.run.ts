import "@tanstack/react-start/server-only";

import {
  GetDealOpportunityById,
  countDocumentChunksByDealOpportunityId,
  listActiveIngestionPipelineJobsForDeal,
  listDealOpportunityDocumentsSummary,
  listIcScorerRunsForDealOpportunity,
} from "@repo/db/queries";
import { getBitrixSyncEnv, inferPortalBaseFromWebhook } from "@repo/bitrix-sync";
import type {
  IcScorerBootstrapFieldRow,
  IcScorerBootstrapInput,
  IcScorerBootstrapPayload,
} from "@/lib/ic-scorer-bootstrap-types";
import type { IcScorerRun } from "@repo/db/schema";
import {
  assertValidBitrixWidgetContext,
  resolveDealOpportunityForBitrixDeal,
} from "@/lib/server/bitrix-widget-deal-resolve";
import {
  buildBitrixOpportunitySyncFieldLabelById,
  bitrixWidgetOmitFileFieldType,
  fetchBitrixWidgetDealSnapshot,
  formatBitrixWidgetFieldDisplayValue,
} from "@/lib/server/bitrix-widget-deal-snapshot";

function serializeBitrixValue(value: unknown): string {
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
}

export async function runIcScorerBootstrapPayload(
  input: IcScorerBootstrapInput,
): Promise<IcScorerBootstrapPayload> {
  await assertValidBitrixWidgetContext(input);
  const env = getBitrixSyncEnv();
  const portalBaseForUi =
    env?.portalBaseUrl?.trim() ||
    (env?.webhookBaseUrl ? inferPortalBaseFromWebhook(env.webhookBaseUrl) : "");

  const dealOpportunityId = await resolveDealOpportunityForBitrixDeal(
    input.dealId,
  );

  const opportunitySyncLabels = buildBitrixOpportunitySyncFieldLabelById();

  let title: string | null = null;
  let stageId: string | null = null;
  let amount: string | null = null;
  const fields: IcScorerBootstrapFieldRow[] = [];

  const snap = await fetchBitrixWidgetDealSnapshot({
    dealId: input.dealId,
    webhookBaseUrl: env?.webhookBaseUrl,
  });

  if (snap) {
    const rawDeal = snap.rawDeal;
    const fieldMetaById = new Map(
      snap.fieldRows.map((r) => [r.fieldId, r] as const),
    );

    const bitrixStr = (v: unknown) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s || null;
    };

    title = bitrixStr(rawDeal.TITLE ?? rawDeal.title);
    stageId = bitrixStr(rawDeal.STAGE_ID ?? rawDeal.stageId);
    amount = bitrixStr(rawDeal.OPPORTUNITY ?? rawDeal.amount);

    for (const [key, value] of Object.entries(rawDeal)) {
      if (key === "undefined") continue;
      if (bitrixWidgetOmitFileFieldType(fieldMetaById.get(key)?.type)) continue;
      const meta = fieldMetaById.get(key);
      const portalTitle = meta?.title?.trim() ?? "";
      const label =
        opportunitySyncLabels.get(key) ??
        (portalTitle && portalTitle !== key ? portalTitle : key);
      const fieldType = meta?.type ?? null;
      fields.push({
        key,
        label,
        type: fieldType,
        value: formatBitrixWidgetFieldDisplayValue(
          fieldType,
          value,
          serializeBitrixValue,
        ),
      });
    }
    fields.sort(
      (a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }) ||
        a.key.localeCompare(b.key),
    );
  }

  const [indexedCount, dealDocuments, ingestionPipelineJobs, appOpp] =
    await Promise.all([
      countDocumentChunksByDealOpportunityId(dealOpportunityId),
      listDealOpportunityDocumentsSummary(dealOpportunityId),
      listActiveIngestionPipelineJobsForDeal(dealOpportunityId),
      GetDealOpportunityById(dealOpportunityId),
    ]);

  let recentRuns: IcScorerRun[] = [];
  try {
    recentRuns = await listIcScorerRunsForDealOpportunity(
      dealOpportunityId,
      20,
    );
  } catch (err) {
    console.warn("[ic-scorer bootstrap] listIcScorerRunsForDealOpportunity failed", {
      dealOpportunityId,
      cause: err instanceof Error ? err.message : String(err),
    });
  }

  if (!title && appOpp?.title) title = appOpp.title;
  if (!stageId && appOpp?.stage) stageId = appOpp.stage;

  return {
    dealId: input.dealId,
    dealOpportunityId,
    webhookConfigured: Boolean(env?.webhookBaseUrl),
    portalBaseUrl: portalBaseForUi,
    title,
    stageId,
    amount,
    fields,
    dealDocuments,
    ingestionPipelineJobs,
    indexedCount,
    recentIcScorerRuns: recentRuns.map((r: IcScorerRun) => ({
      runId: r.id,
      status: r.status,
      mode: r.mode,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
      targetDocumentId: r.targetDocumentId,
    })),
  };
}
