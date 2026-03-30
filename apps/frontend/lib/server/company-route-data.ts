import { createServerFn } from "@tanstack/react-start";
import {
  GetAllCompanies,
  GetCompanyById,
  GetCompanyWithAllRelations,
} from "@repo/db/queries";

export const loadCompaniesPageData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { offset: number; limit: number })
  .handler(async ({ data }) => {
    const { data: rows, totalPages, totalCount } = await GetAllCompanies({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadCompanyDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const companyData = await GetCompanyWithAllRelations(data.uid);
      return { companyData, error: null as string | null };
    } catch (err) {
      console.error("Error fetching company", err);
      return {
        companyData: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadCompanyForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const company = await GetCompanyById(data.uid);
      return { company, error: null as string | null };
    } catch (err) {
      console.error("Error fetching company", err);
      return {
        company: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
