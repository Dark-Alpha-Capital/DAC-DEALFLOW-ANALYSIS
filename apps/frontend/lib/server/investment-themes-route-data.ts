import { createServerFn } from "@tanstack/react-start";
import {
  GetAllThemes,
  GetCompaniesByThemeId,
  GetThemeById,
  GetThemeWorkspaceById,
} from "@repo/db/queries";

export const loadInvestmentThemesPageData = createServerFn({ method: "GET" })
  .inputValidator(
    (raw: unknown) =>
      raw as {
        offset: number;
        limit: number;
        search: string;
        sector: string;
        status: "ACTIVE" | "PAUSED" | "RETIRED" | undefined;
        minCapitalPriorityScore: number | undefined;
        maxCapitalPriorityScore: number | undefined;
        minConfidenceScore: number | undefined;
        maxConfidenceScore: number | undefined;
      },
  )
  .handler(async ({ data }) => {
    const { data: rows, totalPages, totalCount } = await GetAllThemes({
      offset: data.offset,
      limit: data.limit,
      search: data.search,
      sector: data.sector,
      status: data.status,
      minCapitalPriorityScore: data.minCapitalPriorityScore,
      maxCapitalPriorityScore: data.maxCapitalPriorityScore,
      minConfidenceScore: data.minConfidenceScore,
      maxConfidenceScore: data.maxConfidenceScore,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadInvestmentThemeDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const themeWorkspace = await GetThemeWorkspaceById(data.uid);
      let companiesResult = null;
      if (themeWorkspace) {
        companiesResult = await GetCompaniesByThemeId({
          themeId: data.uid,
          offset: 0,
          limit: 100,
        });
      }
      return { themeWorkspace, companiesResult, error: null as string | null };
    } catch (err) {
      console.error("Error fetching theme workspace", err);
      return {
        themeWorkspace: null,
        companiesResult: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadInvestmentThemeForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const theme = await GetThemeById(data.uid);
      return { theme, error: null as string | null };
    } catch (err) {
      console.error("Error fetching theme", err);
      return {
        theme: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
