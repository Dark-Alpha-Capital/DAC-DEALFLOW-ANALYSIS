import { createServerFn } from "@tanstack/react-start";
import {
  GetAllLeads,
  GetCompanyByFirstSeenFromLeadId,
  GetCompanyById,
  GetLeadById,
} from "@repo/db/queries";
import { getDeterministicScreeningByLeadId } from "@repo/deal-screening";
import type { Company, Lead, LeadScreening } from "@repo/db/schema";

/** Single shape so TS does not infer a union that narrows `lead`/`duplicateCompany` to `never`. */
export type LeadDetailLoaderData = {
  lead: Lead | null;
  convertedCompany: Company | null;
  duplicateCompany: Company | null;
  deterministicScreening: LeadScreening | null;
  error: string | null;
};

export const loadLeadsPageData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { offset: number; limit: number })
  .handler(async ({ data }) => {
    const { data: rows, totalPages, totalCount } = await GetAllLeads({
      offset: data.offset,
      limit: data.limit,
    });
    return { data: rows, totalPages, totalCount };
  });

export const loadLeadDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }): Promise<LeadDetailLoaderData> => {
    try {
      const lead = await GetLeadById(data.uid);
      if (!lead) {
        return {
          lead: null,
          convertedCompany: null,
          duplicateCompany: null,
          deterministicScreening: null,
          error: null,
        };
      }
      const [convertedCompany, duplicateCompany, deterministicScreening] =
        await Promise.all([
          GetCompanyByFirstSeenFromLeadId(lead.id),
          lead.duplicateCompanyId
            ? GetCompanyById(lead.duplicateCompanyId)
            : Promise.resolve(null),
          getDeterministicScreeningByLeadId(lead.id),
        ]);
      return {
        lead,
        convertedCompany,
        duplicateCompany,
        deterministicScreening,
        error: null,
      };
    } catch (err) {
      console.error("Error fetching lead", err);
      return {
        lead: null,
        convertedCompany: null,
        duplicateCompany: null,
        deterministicScreening: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadLeadForEditData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const lead = await GetLeadById(data.uid);
      return { lead, error: null as string | null };
    } catch (err) {
      console.error("Error fetching lead", err);
      return {
        lead: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

export const loadConvertLeadPageData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    try {
      const lead = await GetLeadById(data.uid);
      if (!lead) {
        return { outcome: "empty" };
      }
      const existingCompany = await GetCompanyByFirstSeenFromLeadId(lead.id);
      if (existingCompany) {
        return {
          outcome: "redirect",
          to: `/companies/${existingCompany.id}`,
          replace: true,
        };
      }
      if (lead.duplicateCompanyId) {
        const duplicateCompany = await GetCompanyById(lead.duplicateCompanyId);
        if (duplicateCompany) {
          return {
            outcome: "redirect",
            to: `/companies/${duplicateCompany.id}`,
            replace: true,
          };
        }
      }
      return { outcome: "ok", lead };
    } catch (err) {
      console.error("Error fetching lead", err);
      return {
        outcome: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
