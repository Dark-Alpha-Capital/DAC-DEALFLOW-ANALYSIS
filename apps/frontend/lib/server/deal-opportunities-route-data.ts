import { createServerFn } from "@tanstack/react-start";
import {
  GetDealOpportunityById,
  GetDealWithAllRelations,
  GetRankedDealOpportunities,
} from "@repo/db/queries";
import { getBitrixSyncPreviewData } from "./bitrix-sync-preview-data";

export const loadRankedDealOpportunitiesPageData = createServerFn({
  method: "GET",
}).handler(async () => {
  const rows = await GetRankedDealOpportunities();
  const seen = new Set<string>();
  const deals = rows.filter((r) => {
    if (seen.has(r.opp.id)) return false;
    seen.add(r.opp.id);
    return true;
  });
  return { deals };
});

export const loadDealOpportunityDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const dealData = await GetDealWithAllRelations(data.uid);
      return { dealData, error: null as string | null };
    } catch (err) {
      console.error("Error fetching deal with all relations", err);
      return {
        dealData: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadDealOpportunityForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const opp = await GetDealOpportunityById(data.uid);
      return { opp, error: null as string | null };
    } catch (err) {
      console.error("Error fetching deal", err);
      return {
        opp: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadBitrixSyncPreviewData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { dealOpportunityId: string })
  .handler(async ({ data }) => {
    try {
      const result = await getBitrixSyncPreviewData(data.dealOpportunityId);
      if (!result.success) {
        return { preview: null, error: result.message };
      }
      return { preview: result.data, error: null as string | null };
    } catch (err) {
      console.error("Error loading Bitrix sync preview", err);
      return {
        preview: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
