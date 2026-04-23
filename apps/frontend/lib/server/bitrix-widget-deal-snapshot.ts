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

export function bitrixWidgetOmitFileFieldType(
  fieldType: string | null | undefined,
): boolean {
  const t = (fieldType ?? "").toLowerCase();
  return t.includes("file") || t.includes("disk");
}

export async function loadBitrixDealFieldRowsForWidget(webhookBaseUrl: string | undefined): Promise<{
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

export function buildBitrixOpportunitySyncFieldLabelById(): Map<string, string> {
  const meta = getAiBitrixFormFieldMeta();
  const m = new Map<string, string>();
  for (const v of Object.values(meta)) {
    const id = v.bitrixFieldId?.trim();
    if (id) m.set(id, v.label);
  }
  return m;
}

export function formatBitrixWidgetFieldDisplayValue(
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

export type BitrixWidgetDealSnapshot = {
  rawDeal: Record<string, unknown>;
  fieldRows: BitrixDealFieldRow[];
  fieldLabelSource: "live" | "catalog" | "none";
};

/**
 * Live Bitrix deal record + merged field catalog (for widget prompts: IC scorer, screening, etc.).
 * Mirrors `load-bitrix-screening-widget-bootstrap` Bitrix fetch (including optional webhook).
 */
export async function fetchBitrixWidgetDealSnapshot(input: {
  dealId: string;
  webhookBaseUrl: string | undefined;
}): Promise<BitrixWidgetDealSnapshot | null> {
  const webhookOpts = input.webhookBaseUrl?.trim()
    ? { webhookBaseUrl: input.webhookBaseUrl }
    : undefined;
  try {
    const [{ rows: fieldRows, source: labelSource }, rawDeal] =
      await Promise.all([
        loadBitrixDealFieldRowsForWidget(input.webhookBaseUrl),
        callBitrix<Record<string, unknown>>(
          "crm.deal.get",
          { id: input.dealId },
          webhookOpts,
        ),
      ]);
    return {
      rawDeal: rawDeal ?? {},
      fieldRows,
      fieldLabelSource: labelSource,
    };
  } catch (e) {
    console.warn("[fetchBitrixWidgetDealSnapshot] failed", {
      dealId: input.dealId,
      message: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
