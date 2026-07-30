import { createServerFn } from "@tanstack/react-start";
import {
  GetAllInvestors,
  GetInvestorById,
  GetInvestorCompanyLinksByInvestorId,
  GetInvestorWithRelations,
} from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  offsetLimitSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";

export const loadInvestorsPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => offsetLimitSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const { data: rows, totalPages, totalCount } = await GetAllInvestors({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadInvestorDetailData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
