import { createServerFn } from "@tanstack/react-start";
import {
  GetDealById,
  GetDealOpportunityById,
  GetDealOpportunityByLegacyDealId,
  GetDealWithAllRelations,
  GetAllDeals,
  getAllDealReasoningsWithScreenerName,
  getAllScreeners,
  getCompleteAiReasoningById,
} from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  rawDealsListFilterSchema,
  uidAndReasoningIdSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";

export const loadRawDealsPageData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rawDealsListFilterSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const { data: rows, totalPages, totalCount } = await GetAllDeals({
      search: data.search,
      offset: data.offset,
      limit: data.limit,
      dealTypes: data.dealTypes,
      ebitda: data.ebitda,
      userId: data.userId,
      revenue: data.revenue,
      location: data.location,
      maxRevenue: data.maxRevenue,
      maxEbitda: data.maxEbitda,
      brokerage: data.brokerage,
      industry: data.industry,
      ebitdaMargin: data.ebitdaMargin,
      showSeen: data.showSeen,
      showRecent: data.showRecent,
      showReviewed: data.showReviewed,
      showPublished: data.showPublished,
      status: data.status,
      tags: data.tags,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadRawDealDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler((async ({ data }: { data: { uid: string } }) => {
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
  }) as any);

export const loadRawDealForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    try {
      const deal = await GetDealById(data.uid);
      return { deal };
    } catch (error) {
      console.error("Error fetching deal by id", error);
      return { deal: null };
    }
  });

export const loadRawDealReasoningsData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const reasonings = await getAllDealReasoningsWithScreenerName(data.uid);
    return { dealId: data.uid, reasonings: reasonings ?? [] };
  });

export const loadRawDealReasoningDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidAndReasoningIdSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const reasoning = await getCompleteAiReasoningById(data.reasoningId);
    return { dealId: data.uid, reasoning };
  });

export const loadRawDealScreenData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const dealId = data.uid;
    const [availableScreeners, byId, byLegacyDealId] = await Promise.all([
      getAllScreeners(),
      GetDealOpportunityById(dealId),
      GetDealOpportunityByLegacyDealId(dealId),
    ]);
    const dealOpportunityId = byId?.id || byLegacyDealId?.id || dealId;
    return {
      dealId,
      dealOpportunityId,
      screeners: availableScreeners || [],
    };
  });
