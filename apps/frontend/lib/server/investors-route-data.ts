import { createServerFn } from "@tanstack/react-start";
import {
  GetAllInvestors,
  GetInvestorById,
  GetInvestorCompanyLinksByInvestorId,
  GetInvestorWithRelations,
} from "@repo/db/queries";

export const loadInvestorsPageData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { offset: number; limit: number })
  .handler(async ({ data }) => {
    const { data: rows, totalPages, totalCount } = await GetAllInvestors({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadInvestorDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const investorData = await GetInvestorWithRelations(data.uid);
      return { data: investorData, error: null as string | null };
    } catch (err) {
      console.error("Error fetching investor", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadInvestorForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const [investor, companyLinks] = await Promise.all([
        GetInvestorById(data.uid),
        GetInvestorCompanyLinksByInvestorId(data.uid),
      ]);
      return { investor, companyLinks, error: null as string | null };
    } catch (err) {
      console.error("Error fetching investor", err);
      return {
        investor: null,
        companyLinks: [] as Awaited<
          ReturnType<typeof GetInvestorCompanyLinksByInvestorId>
        >,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
