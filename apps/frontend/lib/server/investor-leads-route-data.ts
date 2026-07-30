import { createServerFn } from "@tanstack/react-start";
import {
  GetAllInvestorLeads,
  GetInvestorByFirstSeenFromInvestorLeadId,
  GetInvestorLeadById,
  GetInvestorLeadWithRelations,
} from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import {
  offsetLimitSchema,
  uidParamSchema,
} from "@/lib/server/server-fn-input-schemas";

export const loadInvestorLeadsPageData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => offsetLimitSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const { data: rows, totalPages, totalCount } = await GetAllInvestorLeads({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadInvestorLeadDetailData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    try {
      const leadData = await GetInvestorLeadWithRelations(data.uid);
      if (!leadData?.lead) {
        return { data: leadData, existingInvestor: null, error: null };
      }
      const existingInvestor = await GetInvestorByFirstSeenFromInvestorLeadId(
        leadData.lead.id,
      );
      return { data: leadData, existingInvestor, error: null };
    } catch (err) {
      console.error("Error fetching investor lead", err);
      return {
        data: null,
        existingInvestor: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadInvestorLeadForEditData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    try {
      const lead = await GetInvestorLeadById(data.uid);
      return { lead, error: null as string | null };
    } catch (err) {
      console.error("Error fetching investor lead", err);
      return {
        lead: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadConvertInvestorLeadPageData = createServerFn({
  method: "GET",
})
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    try {
      const lead = await GetInvestorLeadById(data.uid);
      if (!lead) {
        return { outcome: "empty" };
      }
      const existingInvestor = await GetInvestorByFirstSeenFromInvestorLeadId(
        lead.id,
      );
      if (existingInvestor) {
        return {
          outcome: "redirect",
          to: `/investors/${existingInvestor.id}`,
          replace: true,
        };
      }
      return { outcome: "ok", lead };
    } catch (err) {
      console.error("Error fetching investor lead", err);
      return {
        outcome: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
