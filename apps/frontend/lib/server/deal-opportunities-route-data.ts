import { createServerFn } from "@tanstack/react-start";
import {
  GetDealOpportunityById,
  GetDealWithAllRelations,
  GetRankedDealOpportunitiesPaginated,
  GetRankedDealOpportunityKanbanSummary,
  GetRankedDealOpportunitiesForKanbanColumnPaginated,
  getActiveCimForDeal,
  GetCIMExtractionByDealOpportunityId,
  type RankedDealOpportunityRow,
} from "@repo/db/queries";
import db, { themes, asc, isNull } from "@repo/db";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  dealOpportunityIdSchema,
  dealOpportunitiesKanbanInitialInputSchema,
  dealOpportunitiesKanbanStagePageInputSchema,
  rankedDealOpportunitiesPageInputSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";
import { getBitrixSyncPreviewData } from "./bitrix-sync-preview-data";
import {
  BITRIX_DEAL_PIPELINE_ID,
  getBitrixDealStages,
  getDefaultBitrixStageId,
} from "@repo/bitrix-sync";

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
})
  .inputValidator((raw: unknown) =>
    rankedDealOpportunitiesPageInputSchema.parse(raw),
  )
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const { data: rows, totalCount, totalPages } =
      await GetRankedDealOpportunitiesPaginated({
        offset: data.offset,
        limit: data.limit,
        query: data.query ?? "",
      });
    return {
      deals: rows,
      totalCount,
      totalPages,
      pipelineStages: getBitrixDealStages(),
    };
  });

export const loadDealOpportunitiesKanbanInitialData = createServerFn({
  method: "GET",
})
  .inputValidator((raw: unknown) =>
    dealOpportunitiesKanbanInitialInputSchema.parse(raw),
  )
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const pipelineStages = getBitrixDealStages();
    const pipelineCategoryId =
      data.pipelineCategoryId?.trim() || BITRIX_DEAL_PIPELINE_ID;
    const limitPerStage = data.limitPerStage ?? 40;
    const query = data.query ?? "";
    const fallbackStageId = getDefaultBitrixStageId(pipelineStages);
    const allIds = pipelineStages.map((s) => s.statusId);

    if (pipelineStages.length === 0) {
      return {
        pipelineStages,
        totalCount: 0,
        countsByStage: {} as Record<string, number>,
        initialRowsByStage: {} as Record<string, RankedDealOpportunityRow[]>,
        limitPerStage,
        pipelineCategoryId,
        fallbackStageId,
        allPipelineStageIds: allIds,
      };
    }

    const { totalCount, countsByStage } =
      await GetRankedDealOpportunityKanbanSummary({
        query,
        pipelineCategoryId,
        pipelineStageIds: allIds,
        fallbackStageId,
      });

    const pages = await Promise.all(
      pipelineStages.map((col) =>
        GetRankedDealOpportunitiesForKanbanColumnPaginated({
          columnStageId: col.statusId,
          fallbackStageId,
          allPipelineStageIds: allIds,
          query,
          offset: 0,
          limit: limitPerStage,
          pipelineCategoryId,
        }),
      ),
    );

    const initialRowsByStage: Record<string, RankedDealOpportunityRow[]> = {};
    pipelineStages.forEach((col, i) => {
      initialRowsByStage[col.statusId] = pages[i] ?? [];
    });

    return {
      pipelineStages,
      totalCount,
      countsByStage,
      initialRowsByStage,
      limitPerStage,
      pipelineCategoryId,
      fallbackStageId,
      allPipelineStageIds: allIds,
    };
  });

export const loadRankedDealOpportunitiesKanbanStagePage = createServerFn({
  method: "POST",
})
  .inputValidator((raw: unknown) =>
    dealOpportunitiesKanbanStagePageInputSchema.parse(raw),
  )
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const rows = await GetRankedDealOpportunitiesForKanbanColumnPaginated({
      columnStageId: data.columnStageId,
      fallbackStageId: data.fallbackStageId,
      allPipelineStageIds: data.allPipelineStageIds,
      query: data.query ?? "",
      offset: data.offset,
      limit: data.limit,
      pipelineCategoryId: data.pipelineCategoryId,
    });
    return { rows };
  });

export const loadDealOpportunityDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler((async ({ data }: { data: { uid: string } }) => {
    await assertAuthenticated();
    try {
      const [dealData, activeCim, extraction] = await Promise.all([
        GetDealWithAllRelations(data.uid),
        getActiveCimForDeal(data.uid),
        GetCIMExtractionByDealOpportunityId(data.uid),
      ]);

      const hasFinancials = !!extraction;
      const cimAnalysis = {
        activeCim: activeCim
          ? {
            id: activeCim.id,
            status: hasFinancials
              ? ("ready" as const)
              : ("processing" as const),
          }
          : null,
        revenueHistory: extraction?.revenueHistory ?? {},
        ebitdaHistory: extraction?.ebitdaHistory ?? {},
        employeeCount: extraction?.employeeCount,
        customerConcentration: extraction?.customerConcentration,
        capexIntensity: extraction?.capexIntensity,
        revenueBreakdown: extraction?.revenueBreakdown ?? {},
        growthDrivers: extraction?.growthDrivers ?? [],
        keyRisks: extraction?.keyRisks ?? [],
        industryOverview: extraction?.industryOverview,
        transactionDetails: extraction?.transactionDetails,
        documentFileName: extraction?.documentFileName,
        documentCreatedAt: extraction?.documentCreatedAt,
      };

      return { dealData, cimAnalysis, error: null as string | null };
    } catch (err) {
      console.error("Error fetching deal with all relations", err);
      return {
        dealData: null,
        cimAnalysis: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }) as any);

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
