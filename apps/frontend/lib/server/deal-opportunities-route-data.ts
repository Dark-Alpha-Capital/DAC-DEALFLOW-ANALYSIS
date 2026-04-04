import { createServerFn } from "@tanstack/react-start";
import {
  GetDealOpportunityById,
  GetDealWithAllRelations,
  GetRankedDealOpportunities,
} from "@repo/db/queries";
import db, { themes, asc, isNull } from "@repo/db";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  dealOpportunityIdSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";
import { getBitrixSyncPreviewData } from "./bitrix-sync-preview-data";

/** Same rows as `trpc.themes.listForSelect` — for quick-add theme picker + route loader. */
export const loadThemesForSelectData = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAuthenticated();
    const rows = await db
      .select({
        id: themes.id,
        name: themes.name,
        status: themes.status,
      })
      .from(themes)
      .where(isNull(themes.deletedAt))
      .orderBy(asc(themes.name));
    return { themes: rows };
  },
);

export const loadRankedDealOpportunitiesPageData = createServerFn({
  method: "GET",
}).handler(async () => {
  await assertAuthenticated();
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
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
  .inputValidator((raw: unknown) => dealOpportunityIdSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
