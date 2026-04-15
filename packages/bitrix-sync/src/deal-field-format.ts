import { getBitrixDealFieldsCatalog } from "./deal-fields-catalog";

function formatLocalDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format a value for `crm.deal.add` / `update` from catalog field type
 * (e.g. `money` → `{ VALUE, CURRENCY }`, `date` / `datetime` from `Date`).
 */
export function formatDealUfPayloadValue(
  fieldId: string,
  value: unknown,
  currencyId: string,
): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    if (!(value instanceof Date)) return value;
  }
  const catalog = getBitrixDealFieldsCatalog();
  const row = catalog.find((f) => f.fieldId === fieldId);
  const t = (row?.type ?? "").toLowerCase();
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (t === "datetime") {
      return value.toISOString();
    }
    return formatLocalDateYmd(value);
  }
  if (
    t === "money" &&
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return { VALUE: value, CURRENCY: currencyId };
  }
  return value;
}
