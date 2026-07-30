import { createServerFn } from "@tanstack/react-start";
import {
  GetAllCompanies,
  GetCompanyById,
  GetCompanyWithAllRelations,
} from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  offsetLimitSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";

export const loadCompaniesPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => offsetLimitSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const { data: rows, totalPages, totalCount } = await GetAllCompanies({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadCompanyDetailData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
