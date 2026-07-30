/**
 * Bitrix24 opens placement handlers with POST + application/x-www-form-urlencoded
 * fields including PLACEMENT_OPTIONS (JSON) with the entity id.
 */
export function extractBitrixDealIdFromFormData(formData: FormData): {
  dealId: string | null;
  placement: string | null;
} {
  const placementRaw = formData.get("PLACEMENT");
  const placement =
    typeof placementRaw === "string" && placementRaw.trim()
      ? placementRaw.trim()
      : null;

  const optionsRaw = formData.get("PLACEMENT_OPTIONS");
  if (typeof optionsRaw !== "string" || !optionsRaw.trim()) {
    return { dealId: null, placement };
  }

  try {
    const options = JSON.parse(optionsRaw) as Record<string, unknown>;
    const id =
      options.ID ?? options.id ?? options.ENTITY_ID ?? options.entityId;
    if (id == null) {
      return { dealId: null, placement };
    }
    const s = String(id).trim();
    return { dealId: s || null, placement };
  } catch {
    return { dealId: null, placement };
  }
}
