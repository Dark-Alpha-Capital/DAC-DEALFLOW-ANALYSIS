import { createServerFn } from "@tanstack/react-start";
import type { DealStatus, DealType } from "@repo/db/enums";
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

export const loadRawDealsPageData = createServerFn({ method: "GET" })
  .inputValidator(
    (raw: unknown) =>
      raw as {
        search: string;
        offset: number;
        limit: number;
        dealTypes: DealType[];
        ebitda: string;
        userId: string;
        revenue: string;
        location: string;
        maxRevenue: string;
        maxEbitda: string;
        brokerage: string;
        industry: string;
        ebitdaMargin: string;
        showSeen: boolean;
        showRecent: boolean;
        showReviewed: boolean;
        showPublished: boolean;
        status: DealStatus;
        tags: string[];
      },
  )
  .handler(async ({ data }) => {
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

export const loadRawDealForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const deal = await GetDealById(data.uid);
      return { deal };
    } catch (error) {
      console.error("Error fetching deal by id", error);
      return { deal: null };
    }
  });

export const loadRawDealReasoningsData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    const reasonings = await getAllDealReasoningsWithScreenerName(data.uid);
    return { dealId: data.uid, reasonings: reasonings ?? [] };
  });

export const loadRawDealReasoningDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string; reasoningId: string })
  .handler(async ({ data }) => {
    const reasoning = await getCompleteAiReasoningById(data.reasoningId);
    return { dealId: data.uid, reasoning };
  });

export const loadRawDealScreenData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
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
