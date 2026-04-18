/**
 * Builds the same Bitrix deal field listing as the embedded widget bootstrap
 * (`loadBitrixScreeningWidgetBootstrapData`),
 * as plain text for CIM screening prompts. Used only for the Bitrix widget screening path
 * (`dealListingContextSource: "bitrix_live_snapshot"`), not for in-app deal screening (DB row).
 */
import {
  callBitrix,
  callBitrixListAll,
  formatBitrixMoneyForDisplay,
  getAiBitrixFormFieldMeta,
  getBitrixDealFieldsCatalog,
  mergeBitrixDealFieldRows,
  normalizeBitrixDealFieldsResult,
  normalizeBitrixDealUserfieldListItem,
  type BitrixDealFieldRow,
} from "@repo/bitrix-sync";

const BITRIX_WIDGET_LISTING_CONTEXT_MAX_CHARS = 100_000;

function bitrixWidgetOmitFileFieldType(fieldType: string | null | undefined): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return t.includes("file") || t.includes("disk");
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

/**
 * Live `crm.deal.get` + portal field labels, aligned with the Bitrix screening widget table.
 * Returns null if webhook URL is missing or the API call fails.
 */
export async function fetchBitrixWidgetScreeningListingContext(options: {
  webhookBaseUrl: string | undefined;
  bitrixDealId: string;
}): Promise<string | null> {
  const webhookBaseUrl = options.webhookBaseUrl?.trim();
  if (!webhookBaseUrl) {
    return null;
  }
  const webhookOpts = { webhookBaseUrl };
  try {
    const [{ rows: fieldRows, source: labelSource }, rawDeal] = await Promise.all([
      loadBitrixDealFieldRowsForWidget(webhookBaseUrl),
      callBitrix<Record<string, unknown>>(
        "crm.deal.get",
        { id: options.bitrixDealId },
        webhookOpts,
      ),
    ]);
    const fieldMetaById = new Map(
      fieldRows.map((r) => [r.fieldId, r] as const),
    );
    const opportunitySyncLabels = buildBitrixOpportunitySyncFieldLabelById();

    const bitrixDealFields = Object.entries(rawDeal ?? {})
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

    let body = [
      `Bitrix CRM deal snapshot (Bitrix deal id: ${options.bitrixDealId})`,
      `Field metadata: ${labelSource === "live" ? "live (portal labels)" : "catalog fallback"}`,
      "",
      ...bitrixDealFields.map((r) => `${r.label}: ${r.value}`),
    ].join("\n");

    if (body.length > BITRIX_WIDGET_LISTING_CONTEXT_MAX_CHARS) {
      body =
        body.slice(0, BITRIX_WIDGET_LISTING_CONTEXT_MAX_CHARS) +
        "\n\n[Deal field listing truncated for screening prompt size]";
    }
    return body;
  } catch (error) {
    console.warn("[fetchBitrixWidgetScreeningListingContext] failed", {
      bitrixDealId: options.bitrixDealId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
