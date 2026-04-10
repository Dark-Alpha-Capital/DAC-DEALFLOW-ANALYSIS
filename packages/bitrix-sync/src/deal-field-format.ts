import { getBitrixDealFieldsCatalog } from "./deal-fields-catalog";

/**
 * Format a value for `crm.deal.add` / `update` from catalog field type
 * (e.g. `money` → `{ VALUE, CURRENCY }`).
 */
export function formatDealUfPayloadValue(
  fieldId: string,
  value: unknown,
  currencyId: string,
): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }
  const catalog = getBitrixDealFieldsCatalog();
  const row = catalog.find((f) => f.fieldId === fieldId);
  const t = (row?.type ?? "").toLowerCase();
  if (
    t === "money" &&
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return { VALUE: value, CURRENCY: currencyId };
  }
  return value;
}
