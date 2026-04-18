import { TRPCError } from "@trpc/server";
import { callBitrix } from "@repo/bitrix-sync";
import {
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
} from "@repo/db/queries";

/**
 * Resolve a deal opportunity by primary id or legacy Bitrix/import id.
 * Shared by `syncDealOpportunityToBitrix` and `syncScreeningRunToBitrix`.
 */
export async function requireDealOpportunityForBitrixSync(
  dealOpportunityId: string,
) {
  let opp = await GetDealOpportunityById(dealOpportunityId);
  if (!opp) {
    opp = await GetDealOpportunityByLegacyDealId(dealOpportunityId);
  }
  if (!opp) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Deal opportunity not found",
    });
  }
  return opp;
}

export type DealOpportunityRowForBitrixSync = NonNullable<
  Awaited<ReturnType<typeof GetDealOpportunityById>>
>;

/** `crm.deal.update` when `bitrixId` exists, otherwise `crm.deal.add`. */
export async function upsertBitrixCrmDeal(
  opp: DealOpportunityRowForBitrixSync,
  fields: Record<string, unknown>,
): Promise<{ bitrixId: string }> {
  if (opp.bitrixId?.trim()) {
    await callBitrix("crm.deal.update", {
      id: opp.bitrixId.trim(),
      fields,
    });
    return { bitrixId: opp.bitrixId.trim() };
  }
  const created = await callBitrix<number | string>("crm.deal.add", {
    fields,
  });
  return { bitrixId: String(created) };
}
