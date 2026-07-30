import { createServerFn } from "@tanstack/react-start";
import {
  GetAllThemes,
  GetCompaniesByThemeId,
  GetThemeById,
  GetThemeWorkspaceById,
} from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  investmentThemesListFilterSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";

export const loadInvestmentThemesPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) =>
    investmentThemesListFilterSchema.parse(raw),
  )
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
