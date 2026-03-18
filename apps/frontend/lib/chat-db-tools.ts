import { z } from "zod";
import type { SQL } from "drizzle-orm";
import db, {
  and,
  asc,
  companies,
  companyNotes,
  contacts,
  count,
  dealOpportunities,
  desc,
  documentChunks,
  documents,
  eq,
  ilike,
  isNull,
  investorLeads,
  investors,
  leads,
  or,
  screenerQuestions,
  screeners,
  themes,
} from "@repo/db";
import {
  GetDealWithAllRelations,
  GetInvestorByFirstSeenFromInvestorLeadId,
  GetInvestorLeadWithRelations,
  GetInvestorWithRelations,
  GetThemeDocuments,
  GetThemeWorkspaceById,
} from "@repo/db/queries";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const businessEntitySchema = z.enum([
  "leads",
  "companies",
  "themes",
  "screeners",
  "dealOpportunities",
  "documents",
  "investors",
  "investorLeads",
]);

export type BusinessEntity = z.infer<typeof businessEntitySchema>;

export const documentEntityTypeSchema = z.enum([
  "LEAD",
  "COMPANY",
  "DEAL_OPPORTUNITY",
  "THEME",
  "GLOBAL",
]);

const listFiltersSchema = z
  .object({
    status: z.string().trim().optional(),
    stage: z.string().trim().optional(),
    type: z.string().trim().optional(),
    category: z.string().trim().optional(),
    industry: z.string().trim().optional(),
    sourceWebsite: z.string().trim().optional(),
    companyId: z.string().trim().optional(),
    leadId: z.string().trim().optional(),
    dealOpportunityId: z.string().trim().optional(),
    themeId: z.string().trim().optional(),
    entityType: documentEntityTypeSchema.optional(),
    entityId: z.string().trim().optional(),
  })
  .partial();

export const entityCountsInputSchema = z.object({
  entity: businessEntitySchema.or(z.literal("all")).optional(),
  query: z.string().trim().optional(),
  filters: listFiltersSchema.optional(),
});

export const listEntitiesInputSchema = z.object({
  entity: businessEntitySchema,
  query: z.string().trim().optional(),
  filters: listFiltersSchema.optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
  sort: z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
});

export const getEntityByIdInputSchema = z.object({
  entity: businessEntitySchema,
  id: z.string().trim().min(1),
  includeRelated: z.boolean().default(true),
});

export const dealOpportunityDossierInputSchema = z
  .object({
    dealOpportunityId: z.string().trim().optional(),
    query: z.string().trim().optional(),
    includeCompanyDocuments: z.boolean().default(true),
  })
  .refine((value) => Boolean(value.dealOpportunityId || value.query), {
    message: "Either dealOpportunityId or query is required",
    path: ["dealOpportunityId"],
  });

export const themeDossierInputSchema = z
  .object({
    themeId: z.string().trim().optional(),
    query: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.themeId || value.query), {
    message: "Either themeId or query is required",
    path: ["themeId"],
  });

export const entityDocumentsInputSchema = z.object({
  entityType: documentEntityTypeSchema,
  entityId: z.string().trim().optional(),
  limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
  includeExtractedText: z.boolean().default(false),
});

const aggregateGroupBySchema = z.enum([
  "status",
  "stage",
  "type",
  "category",
  "entityType",
  "industry",
  "coverageStatus",
]);

export const queryBusinessDataInputSchema = z.object({
  operation: z.enum(["count", "list", "getById", "aggregate"]),
  entity: businessEntitySchema,
  id: z.string().trim().optional(),
  query: z.string().trim().optional(),
  filters: listFiltersSchema.optional(),
  limit: z.number().int().min(1).max(50).default(DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
  aggregate: z
    .object({
      metric: z.enum(["count", "sumRevenue", "sumEbitda"]).default("count"),
      groupBy: aggregateGroupBySchema.optional(),
    })
    .optional(),
});

export type ChatDbToolContext = {
  companyId?: string | null;
  leadId?: string | null;
  dealOpportunityId?: string | null;
};

function withContextFilters(
  filters: z.infer<typeof listFiltersSchema> | undefined,
  context: ChatDbToolContext,
) {
  return {
    ...(filters ?? {}),
    ...(filters?.companyId ? {} : context.companyId ? { companyId: context.companyId } : {}),
    ...(filters?.leadId ? {} : context.leadId ? { leadId: context.leadId } : {}),
    ...(filters?.dealOpportunityId
      ? {}
      : context.dealOpportunityId
        ? { dealOpportunityId: context.dealOpportunityId }
        : {}),
  };
}

function coerceLimit(limit?: number) {
  if (!limit) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(limit, MAX_LIMIT));
}

function buildLeadWhere(
  query?: string,
  filters?: z.infer<typeof listFiltersSchema>,
) {
  const conditions = [isNull(leads.deletedAt)];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(
        ilike(leads.rawTitle, term),
        ilike(leads.rawIndustry, term),
        ilike(leads.sourceWebsite, term),
        ilike(leads.normalizedCompanyName, term),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as typeof leads.status._.data));
  }
  if (filters?.sourceWebsite) {
    conditions.push(ilike(leads.sourceWebsite, `%${filters.sourceWebsite}%`));
  }

  return and(...conditions);
}

function buildCompanyWhere(
  query?: string,
  filters?: z.infer<typeof listFiltersSchema>,
) {
  const conditions = [isNull(companies.deletedAt)];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(
        ilike(companies.name, term),
        ilike(companies.industry, term),
        ilike(companies.location, term),
      )!,
    );
  }

  if (filters?.industry) {
    conditions.push(ilike(companies.industry, `%${filters.industry}%`));
  }

  if (filters?.themeId) {
    conditions.push(eq(companies.themeId, filters.themeId));
  }

  return and(...conditions);
}

function buildThemeWhere(
  query?: string,
  filters?: z.infer<typeof listFiltersSchema>,
) {
  const conditions = [isNull(themes.deletedAt)];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(ilike(themes.name, term), ilike(themes.description, term), ilike(themes.sector, term))!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(themes.status, filters.status as typeof themes.status._.data));
  }

  return and(...conditions);
}

function buildDocumentsWhere(
  query?: string,
  filters?: z.infer<typeof listFiltersSchema>,
) {
  const conditions: SQL[] = [];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(ilike(documents.title, term), ilike(documents.description, term), ilike(documents.fileName, term))!,
    );
  }

  if (filters?.entityType) conditions.push(eq(documents.entityType, filters.entityType));
  if (filters?.entityId) conditions.push(eq(documents.entityId, filters.entityId));
  if (filters?.category)
    conditions.push(eq(documents.category, filters.category as typeof documents.category._.data));
  if (filters?.companyId) conditions.push(eq(documents.companyId, filters.companyId));
  if (filters?.leadId) conditions.push(eq(documents.leadId, filters.leadId));
  if (filters?.dealOpportunityId)
    conditions.push(eq(documents.dealOpportunityId, filters.dealOpportunityId));
  if (filters?.themeId) conditions.push(eq(documents.themeId, filters.themeId));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildInvestorWhere(
  query?: string,
  filters?: z.infer<typeof listFiltersSchema>,
) {
  const conditions: SQL[] = [];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(
        ilike(investors.name, term),
        ilike(investors.email, term),
        ilike(investors.primaryContactName, term),
        ilike(investors.geography, term),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(eq(investors.status, filters.status as typeof investors.status._.data));
  }
  if (filters?.type) {
    conditions.push(eq(investors.type, filters.type as typeof investors.type._.data));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildInvestorLeadWhere(
  query?: string,
  filters?: z.infer<typeof listFiltersSchema>,
) {
  const conditions: SQL[] = [];

  if (query) {
    const term = `%${query}%`;
    conditions.push(
      or(
        ilike(investorLeads.name, term),
        ilike(investorLeads.email, term),
        ilike(investorLeads.source, term),
        ilike(investorLeads.notes, term),
      )!,
    );
  }

  if (filters?.status) {
    conditions.push(
      eq(investorLeads.status, filters.status as typeof investorLeads.status._.data),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getEntityCounts(
  input: z.infer<typeof entityCountsInputSchema>,
  context: ChatDbToolContext,
) {
  const filters = withContextFilters(input.filters, context);
  const query = input.query?.trim() || undefined;

  const shouldCount = (entity: BusinessEntity) =>
    input.entity === "all" || input.entity == null || input.entity === entity;

  const counts: Record<string, number | null> = {
    leads: null,
    companies: null,
    themes: null,
    screeners: null,
    dealOpportunities: null,
    documents: null,
    investors: null,
    investorLeads: null,
  };

  if (shouldCount("leads")) {
    const [row] = await db
      .select({ value: count() })
      .from(leads)
      .where(buildLeadWhere(query, filters));
    counts.leads = Number(row?.value ?? 0);
  }

  if (shouldCount("companies")) {
    const [row] = await db
      .select({ value: count() })
      .from(companies)
      .where(buildCompanyWhere(query, filters));
    counts.companies = Number(row?.value ?? 0);
  }

  if (shouldCount("themes")) {
    const [row] = await db
      .select({ value: count() })
      .from(themes)
      .where(buildThemeWhere(query, filters));
    counts.themes = Number(row?.value ?? 0);
  }

  if (shouldCount("screeners")) {
    const screenerWhere = query
      ? or(
          ilike(screeners.name, `%${query}%`),
          ilike(screeners.category, `%${query}%`),
          ilike(screeners.description, `%${query}%`),
        )
      : undefined;

    const [row] = await db
      .select({ value: count() })
      .from(screeners)
      .where(screenerWhere);
    counts.screeners = Number(row?.value ?? 0);
  }

  if (shouldCount("dealOpportunities")) {
    const conditions = [isNull(companies.deletedAt)];

    if (query) {
      const term = `%${query}%`;
      conditions.push(
        or(
          ilike(companies.name, term),
          ilike(dealOpportunities.dealTeaser, term),
          ilike(dealOpportunities.sourceWebsite, term),
          ilike(dealOpportunities.brokerage, term),
        )!,
      );
    }

    if (filters?.status) {
      conditions.push(
        eq(dealOpportunities.status, filters.status as typeof dealOpportunities.status._.data),
      );
    }
    if (filters?.stage) {
      conditions.push(
        eq(dealOpportunities.stage, filters.stage as typeof dealOpportunities.stage._.data),
      );
    }
    if (filters?.companyId) conditions.push(eq(dealOpportunities.companyId, filters.companyId));
    if (filters?.leadId) conditions.push(eq(dealOpportunities.leadId, filters.leadId));

    const [row] = await db
      .select({ value: count() })
      .from(dealOpportunities)
      .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
      .where(and(...conditions));

    counts.dealOpportunities = Number(row?.value ?? 0);
  }

  if (shouldCount("documents")) {
    const [row] = await db
      .select({ value: count() })
      .from(documents)
      .where(buildDocumentsWhere(query, filters));
    counts.documents = Number(row?.value ?? 0);
  }

  if (shouldCount("investors")) {
    const whereClause = buildInvestorWhere(query, filters);
    const [row] = await db
      .select({ value: count() })
      .from(investors)
      .where(whereClause ?? undefined);
    counts.investors = Number(row?.value ?? 0);
  }

  if (shouldCount("investorLeads")) {
    const whereClause = buildInvestorLeadWhere(query, filters);
    const [row] = await db
      .select({ value: count() })
      .from(investorLeads)
      .where(whereClause ?? undefined);
    counts.investorLeads = Number(row?.value ?? 0);
  }

  return {
    summary:
      input.entity && input.entity !== "all"
        ? `Counted ${input.entity}`
        : "Counted all business entities",
    data: counts,
    meta: {
      entity: input.entity ?? "all",
      query: query ?? null,
      filters,
    },
  };
}

export async function listEntities(
  input: z.infer<typeof listEntitiesInputSchema>,
  context: ChatDbToolContext,
) {
  const filters = withContextFilters(input.filters, context);
  const query = input.query?.trim() || undefined;
  const limit = coerceLimit(input.limit);
  const offset = input.offset;

  switch (input.entity) {
    case "leads": {
      const whereClause = buildLeadWhere(query, filters);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: leads.id,
            rawTitle: leads.rawTitle,
            rawIndustry: leads.rawIndustry,
            sourceWebsite: leads.sourceWebsite,
            companyLocation: leads.companyLocation,
            status: leads.status,
            createdAt: leads.createdAt,
          })
          .from(leads)
          .where(whereClause)
          .orderBy(
            input.sort === "oldest" ? asc(leads.createdAt) : desc(leads.createdAt),
            desc(leads.id),
          )
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(leads).where(whereClause),
      ]);

      return {
        summary: `Fetched ${rows.length} lead records`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "companies": {
      const whereClause = buildCompanyWhere(query, filters);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: companies.id,
            name: companies.name,
            industry: companies.industry,
            location: companies.location,
            coverageStatus: companies.coverageStatus,
            themeId: companies.themeId,
            updatedAt: companies.updatedAt,
          })
          .from(companies)
          .where(whereClause)
          .orderBy(
            input.sort === "alphabetical"
              ? asc(companies.name)
              : input.sort === "oldest"
                ? asc(companies.createdAt)
                : desc(companies.updatedAt),
          )
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(companies).where(whereClause),
      ]);

      return {
        summary: `Fetched ${rows.length} company records`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "themes": {
      const whereClause = buildThemeWhere(query, filters);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: themes.id,
            name: themes.name,
            sector: themes.sector,
            status: themes.status,
            capitalPriorityScore: themes.capitalPriorityScore,
            confidenceScore: themes.confidenceScore,
            updatedAt: themes.updatedAt,
          })
          .from(themes)
          .where(whereClause)
          .orderBy(
            input.sort === "alphabetical"
              ? asc(themes.name)
              : input.sort === "oldest"
                ? asc(themes.createdAt)
                : desc(themes.updatedAt),
          )
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(themes).where(whereClause),
      ]);

      return {
        summary: `Fetched ${rows.length} investment themes`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "screeners": {
      const screenerWhere = query
        ? or(
            ilike(screeners.name, `%${query}%`),
            ilike(screeners.category, `%${query}%`),
            ilike(screeners.description, `%${query}%`),
          )
        : undefined;

      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: screeners.id,
            name: screeners.name,
            category: screeners.category,
            description: screeners.description,
            createdAt: screeners.createdAt,
            updatedAt: screeners.updatedAt,
          })
          .from(screeners)
          .where(screenerWhere)
          .orderBy(
            input.sort === "alphabetical"
              ? asc(screeners.name)
              : input.sort === "oldest"
                ? asc(screeners.createdAt)
                : desc(screeners.updatedAt),
          )
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(screeners).where(screenerWhere),
      ]);

      return {
        summary: `Fetched ${rows.length} screener templates`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "dealOpportunities": {
      const conditions = [isNull(companies.deletedAt)];

      if (query) {
        const term = `%${query}%`;
        conditions.push(
          or(
            ilike(companies.name, term),
            ilike(dealOpportunities.dealTeaser, term),
            ilike(dealOpportunities.sourceWebsite, term),
            ilike(dealOpportunities.brokerage, term),
          )!,
        );
      }

      if (filters.status) {
        conditions.push(
          eq(dealOpportunities.status, filters.status as typeof dealOpportunities.status._.data),
        );
      }
      if (filters.stage) {
        conditions.push(
          eq(dealOpportunities.stage, filters.stage as typeof dealOpportunities.stage._.data),
        );
      }
      if (filters.companyId) conditions.push(eq(dealOpportunities.companyId, filters.companyId));
      if (filters.leadId) conditions.push(eq(dealOpportunities.leadId, filters.leadId));

      const whereClause = and(...conditions);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: dealOpportunities.id,
            companyId: dealOpportunities.companyId,
            companyName: companies.name,
            dealTeaser: dealOpportunities.dealTeaser,
            stage: dealOpportunities.stage,
            status: dealOpportunities.status,
            revenue: dealOpportunities.revenue,
            ebitda: dealOpportunities.ebitda,
            askingPrice: dealOpportunities.askingPrice,
            updatedAt: dealOpportunities.updatedAt,
          })
          .from(dealOpportunities)
          .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
          .where(whereClause)
          .orderBy(
            input.sort === "oldest"
              ? asc(dealOpportunities.createdAt)
              : desc(dealOpportunities.updatedAt),
            desc(dealOpportunities.id),
          )
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(dealOpportunities)
          .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
          .where(whereClause),
      ]);

      return {
        summary: `Fetched ${rows.length} deal opportunities`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "documents": {
      const whereClause = buildDocumentsWhere(query, filters);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: documents.id,
            entityType: documents.entityType,
            entityId: documents.entityId,
            category: documents.category,
            title: documents.title,
            description: documents.description,
            fileName: documents.fileName,
            fileSize: documents.fileSize,
            mimeType: documents.mimeType,
            ingestionStatus: documents.ingestionStatus,
            createdAt: documents.createdAt,
          })
          .from(documents)
          .where(whereClause)
          .orderBy(
            input.sort === "oldest" ? asc(documents.createdAt) : desc(documents.createdAt),
            desc(documents.id),
          )
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(documents).where(whereClause),
      ]);

      return {
        summary: `Fetched ${rows.length} documents`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "investors": {
      const whereClause = buildInvestorWhere(query, filters);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: investors.id,
            name: investors.name,
            type: investors.type,
            email: investors.email,
            geography: investors.geography,
            status: investors.status,
            minCheckSize: investors.minCheckSize,
            maxCheckSize: investors.maxCheckSize,
            createdAt: investors.createdAt,
          })
          .from(investors)
          .where(whereClause ?? undefined)
          .orderBy(
            input.sort === "alphabetical"
              ? asc(investors.name)
              : input.sort === "oldest"
                ? asc(investors.createdAt)
                : desc(investors.updatedAt),
            desc(investors.id),
          )
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(investors)
          .where(whereClause ?? undefined),
      ]);

      return {
        summary: `Fetched ${rows.length} investors`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }

    case "investorLeads": {
      const whereClause = buildInvestorLeadWhere(query, filters);
      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: investorLeads.id,
            name: investorLeads.name,
            source: investorLeads.source,
            email: investorLeads.email,
            status: investorLeads.status,
            inferredType: investorLeads.inferredType,
            createdAt: investorLeads.createdAt,
          })
          .from(investorLeads)
          .where(whereClause ?? undefined)
          .orderBy(
            input.sort === "alphabetical"
              ? asc(investorLeads.name)
              : input.sort === "oldest"
                ? asc(investorLeads.createdAt)
                : desc(investorLeads.createdAt),
            desc(investorLeads.id),
          )
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(investorLeads)
          .where(whereClause ?? undefined),
      ]);

      return {
        summary: `Fetched ${rows.length} investor leads`,
        data: rows,
        meta: {
          entity: input.entity,
          totalCount: Number(totalRows[0]?.value ?? 0),
          limit,
          offset,
          query: query ?? null,
          filters,
        },
      };
    }
  }
}

export async function getEntityById(
  input: z.infer<typeof getEntityByIdInputSchema>,
  context: ChatDbToolContext,
) {
  if (context.dealOpportunityId && input.entity === "dealOpportunities") {
    if (input.id !== context.dealOpportunityId) {
      return {
        summary: "The requested deal opportunity does not match the active chat context.",
        data: null,
        meta: { contextMismatch: true },
      };
    }
  }

  if (context.companyId && input.entity === "companies") {
    if (input.id !== context.companyId) {
      return {
        summary: "The requested company does not match the active chat context.",
        data: null,
        meta: { contextMismatch: true },
      };
    }
  }

  if (context.leadId && input.entity === "leads") {
    if (input.id !== context.leadId) {
      return {
        summary: "The requested lead does not match the active chat context.",
        data: null,
        meta: { contextMismatch: true },
      };
    }
  }

  switch (input.entity) {
    case "leads": {
      const [lead] = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.id), isNull(leads.deletedAt)))
        .limit(1);

      if (!lead) {
        return { summary: "Lead not found", data: null, meta: { id: input.id } };
      }

      let related = undefined;
      if (input.includeRelated) {
        const [oppsCount, docsCount] = await Promise.all([
          db.select({ value: count() }).from(dealOpportunities).where(eq(dealOpportunities.leadId, lead.id)),
          db
            .select({ value: count() })
            .from(documents)
            .where(and(eq(documents.entityType, "LEAD"), eq(documents.entityId, lead.id))),
        ]);

        related = {
          dealOpportunityCount: Number(oppsCount[0]?.value ?? 0),
          documentCount: Number(docsCount[0]?.value ?? 0),
        };
      }

      return {
        summary: `Fetched lead ${lead.rawTitle}`,
        data: {
          lead,
          related,
        },
        meta: { entity: input.entity, id: input.id },
      };
    }

    case "companies": {
      const [company] = await db
        .select()
        .from(companies)
        .where(and(eq(companies.id, input.id), isNull(companies.deletedAt)))
        .limit(1);

      if (!company) {
        return { summary: "Company not found", data: null, meta: { id: input.id } };
      }

      let related = undefined;
      if (input.includeRelated) {
        const [oppsCount, docsCount, contactsCount, notesCount] = await Promise.all([
          db
            .select({ value: count() })
            .from(dealOpportunities)
            .where(eq(dealOpportunities.companyId, company.id)),
          db
            .select({ value: count() })
            .from(documents)
            .where(and(eq(documents.entityType, "COMPANY"), eq(documents.entityId, company.id))),
          db
            .select({ value: count() })
            .from(contacts)
            .where(and(eq(contacts.entityType, "COMPANY"), eq(contacts.entityId, company.id))),
          db
            .select({ value: count() })
            .from(companyNotes)
            .where(eq(companyNotes.companyId, company.id)),
        ]);

        related = {
          dealOpportunityCount: Number(oppsCount[0]?.value ?? 0),
          documentCount: Number(docsCount[0]?.value ?? 0),
          contactCount: Number(contactsCount[0]?.value ?? 0),
          noteCount: Number(notesCount[0]?.value ?? 0),
        };
      }

      return {
        summary: `Fetched company ${company.name}`,
        data: {
          company,
          related,
        },
        meta: { entity: input.entity, id: input.id },
      };
    }

    case "themes": {
      const themeWorkspace = await GetThemeWorkspaceById(input.id);
      if (!themeWorkspace) {
        return { summary: "Theme not found", data: null, meta: { id: input.id } };
      }

      return {
        summary: `Fetched theme ${themeWorkspace.theme.name}`,
        data: input.includeRelated
          ? themeWorkspace
          : {
              theme: themeWorkspace.theme,
              companyCount: themeWorkspace.companyCount,
              dealOpportunityCount: themeWorkspace.dealOpportunityCount,
            },
        meta: { entity: input.entity, id: input.id },
      };
    }

    case "screeners": {
      const [screener] = await db
        .select()
        .from(screeners)
        .where(eq(screeners.id, input.id))
        .limit(1);

      if (!screener) {
        return { summary: "Screener not found", data: null, meta: { id: input.id } };
      }

      let related = undefined;
      if (input.includeRelated) {
        const [questionCount] = await db
          .select({ value: count() })
          .from(screenerQuestions)
          .where(eq(screenerQuestions.screenerId, screener.id));

        related = {
          questionCount: Number(questionCount?.value ?? 0),
        };
      }

      return {
        summary: `Fetched screener ${screener.name}`,
        data: {
          screener,
          related,
        },
        meta: { entity: input.entity, id: input.id },
      };
    }

    case "dealOpportunities": {
      const dossier = await getDealOpportunityDossier(
        {
          dealOpportunityId: input.id,
          includeCompanyDocuments: true,
        },
        context,
      );
      return {
        summary: dossier.summary,
        data: dossier.data,
        meta: {
          ...dossier.meta,
          entity: input.entity,
          id: input.id,
        },
      };
    }

    case "documents": {
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, input.id))
        .limit(1);

      if (!doc) {
        return { summary: "Document not found", data: null, meta: { id: input.id } };
      }

      let extracted = undefined;
      if (input.includeRelated) {
        const chunks = await db
          .select({
            id: documentChunks.id,
            pageNumber: documentChunks.pageNumber,
            modality: documentChunks.modality,
            chunkText: documentChunks.chunkText,
          })
          .from(documentChunks)
          .where(eq(documentChunks.documentId, doc.id))
          .orderBy(asc(documentChunks.pageNumber), asc(documentChunks.createdAt))
          .limit(5);

        extracted = {
          chunkCount: chunks.length,
          previewChunks: chunks.map((chunk) => ({
            ...chunk,
            chunkText:
              chunk.chunkText && chunk.chunkText.length > 600
                ? `${chunk.chunkText.slice(0, 600)}...`
                : chunk.chunkText,
          })),
        };
      }

      return {
        summary: `Fetched document ${doc.fileName}`,
        data: {
          document: doc,
          extracted,
        },
        meta: { entity: input.entity, id: input.id },
      };
    }

    case "investors": {
      const data = await GetInvestorWithRelations(input.id);
      if (!data?.investor) {
        return { summary: "Investor not found", data: null, meta: { id: input.id } };
      }
      return {
        summary: `Fetched investor ${data.investor.name}`,
        data: input.includeRelated
          ? { investor: data.investor, interactions: data.interactions }
          : { investor: data.investor },
        meta: { entity: input.entity, id: input.id },
      };
    }

    case "investorLeads": {
      const data = await GetInvestorLeadWithRelations(input.id);
      if (!data?.lead) {
        return { summary: "Investor lead not found", data: null, meta: { id: input.id } };
      }
      const convertedInvestor = input.includeRelated
        ? await GetInvestorByFirstSeenFromInvestorLeadId(input.id)
        : null;
      return {
        summary: `Fetched investor lead ${data.lead.name ?? data.lead.email ?? "unknown"}`,
        data: input.includeRelated
          ? {
              lead: data.lead,
              interactions: data.interactions,
              convertedInvestor: convertedInvestor ?? undefined,
            }
          : { lead: data.lead },
        meta: { entity: input.entity, id: input.id },
      };
    }
  }
}

async function resolveDealOpportunityId(
  input: z.infer<typeof dealOpportunityDossierInputSchema>,
  context: ChatDbToolContext,
) {
  if (input.dealOpportunityId) {
    return { id: input.dealOpportunityId, candidates: [] as Array<{ id: string; companyName: string | null; dealTeaser: string | null }> };
  }

  if (context.dealOpportunityId) {
    return { id: context.dealOpportunityId, candidates: [] as Array<{ id: string; companyName: string | null; dealTeaser: string | null }> };
  }

  if (!input.query) {
    return { id: null, candidates: [] as Array<{ id: string; companyName: string | null; dealTeaser: string | null }> };
  }

  const term = `%${input.query}%`;
  const candidates = await db
    .select({
      id: dealOpportunities.id,
      companyName: companies.name,
      dealTeaser: dealOpportunities.dealTeaser,
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(
      and(
        isNull(companies.deletedAt),
        or(ilike(companies.name, term), ilike(dealOpportunities.dealTeaser, term))!,
      ),
    )
    .orderBy(desc(dealOpportunities.updatedAt), desc(dealOpportunities.id))
    .limit(5);

  if (candidates.length === 1) {
    return {
      id: candidates[0]?.id ?? null,
      candidates,
    };
  }

  return { id: null, candidates };
}

export async function getDealOpportunityDossier(
  input: z.infer<typeof dealOpportunityDossierInputSchema>,
  context: ChatDbToolContext,
) {
  const { id, candidates } = await resolveDealOpportunityId(input, context);

  if (!id) {
    if (candidates.length > 1) {
      return {
        summary:
          "Multiple deal opportunities matched the request. Ask the user to clarify which deal they want.",
        data: {
          candidates,
        },
        meta: {
          requiresDisambiguation: true,
        },
      };
    }

    return {
      summary: "No deal opportunity matched the request.",
      data: null,
      meta: {
        requiresDisambiguation: false,
      },
    };
  }

  const payload = await GetDealWithAllRelations(id);

  if (!payload) {
    return {
      summary: "Deal opportunity not found",
      data: null,
      meta: {
        dealOpportunityId: id,
      },
    };
  }

  const baseDocuments = payload.dealDocuments ?? [];
  const relatedCompanyDocuments = input.includeCompanyDocuments
    ? payload.companyDocuments ?? []
    : [];

  return {
    summary: `Fetched dossier for ${payload.deal?.dealCaption ?? "deal opportunity"}`,
    data: {
      deal: payload.deal,
      currentOpportunity: payload.currentOpportunity,
      company: payload.company,
      financials: {
        latestSnapshot: payload.latestFinancialSnapshot,
        snapshots: payload.financialSnapshots,
      },
      riskFlags: payload.riskFlags,
      screenings: payload.aiScreenings,
      deterministicScreening: payload.deterministicScreening,
      cimExtraction: payload.cimExtraction,
      documents: {
        deal: baseDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          fileName: doc.fileName,
          ingestionStatus: doc.ingestionStatus,
          createdAt: doc.createdAt,
        })),
        company: relatedCompanyDocuments.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          fileName: doc.fileName,
          ingestionStatus: doc.ingestionStatus,
          createdAt: doc.createdAt,
        })),
      },
      contacts: {
        company: payload.companyContacts,
        deal: payload.dealContacts,
      },
      outreach: payload.outreach,
      notes: payload.companyNotes,
    },
    meta: {
      dealOpportunityId: id,
      dealDocumentCount: baseDocuments.length,
      companyDocumentCount: relatedCompanyDocuments.length,
      screeningCount: payload.aiScreenings?.length ?? 0,
    },
  };
}

async function resolveThemeId(
  input: z.infer<typeof themeDossierInputSchema>,
) {
  if (input.themeId) {
    return {
      id: input.themeId,
      candidates: [] as Array<{ id: string; name: string; sector: string }> ,
    };
  }

  if (!input.query) {
    return {
      id: null,
      candidates: [] as Array<{ id: string; name: string; sector: string }> ,
    };
  }

  const term = `%${input.query}%`;
  const candidates = await db
    .select({
      id: themes.id,
      name: themes.name,
      sector: themes.sector,
    })
    .from(themes)
    .where(
      and(
        isNull(themes.deletedAt),
        or(ilike(themes.name, term), ilike(themes.description, term), ilike(themes.sector, term))!,
      ),
    )
    .orderBy(desc(themes.updatedAt), desc(themes.id))
    .limit(5);

  if (candidates.length === 1) {
    return { id: candidates[0]?.id ?? null, candidates };
  }

  return { id: null, candidates };
}

export async function getInvestmentThemeDossier(
  input: z.infer<typeof themeDossierInputSchema>,
) {
  const { id, candidates } = await resolveThemeId(input);

  if (!id) {
    if (candidates.length > 1) {
      return {
        summary:
          "Multiple investment themes matched the request. Ask the user to clarify the theme.",
        data: {
          candidates,
        },
        meta: { requiresDisambiguation: true },
      };
    }

    return {
      summary: "No matching investment theme was found.",
      data: null,
      meta: { requiresDisambiguation: false },
    };
  }

  const [workspace, themeDocs] = await Promise.all([
    GetThemeWorkspaceById(id),
    GetThemeDocuments(id),
  ]);

  if (!workspace) {
    return {
      summary: "Theme not found",
      data: null,
      meta: {
        themeId: id,
      },
    };
  }

  return {
    summary: `Fetched theme dossier for ${workspace.theme.name}`,
    data: {
      theme: workspace.theme,
      activeThesis: workspace.activeThesis,
      activeIndustryIntelligence: workspace.activeIndustryIntelligence,
      latestPerformance: workspace.latestPerformance,
      performanceHistory: workspace.performanceHistory,
      coverage: workspace.coverage,
      companyCount: workspace.companyCount,
      dealOpportunityCount: workspace.dealOpportunityCount,
      documents: themeDocs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        fileName: doc.fileName,
        ingestionStatus: doc.ingestionStatus,
        createdAt: doc.createdAt,
      })),
    },
    meta: {
      themeId: id,
      thesisVersionCount: workspace.thesisHistory.length,
      intelligenceVersionCount: workspace.industryIntelligenceHistory.length,
      performanceSnapshotCount: workspace.performanceHistory.length,
      coverageCount: workspace.coverage.length,
      documentCount: themeDocs.length,
    },
  };
}

export async function getEntityDocuments(
  input: z.infer<typeof entityDocumentsInputSchema>,
  context: ChatDbToolContext,
) {
  const limit = coerceLimit(input.limit);
  const offset = input.offset;

  let entityId = input.entityId;
  if (!entityId && input.entityType === "DEAL_OPPORTUNITY") {
    entityId = context.dealOpportunityId ?? undefined;
  }
  if (!entityId && input.entityType === "COMPANY") {
    entityId = context.companyId ?? undefined;
  }
  if (!entityId && input.entityType === "LEAD") {
    entityId = context.leadId ?? undefined;
  }

  if (input.entityType !== "GLOBAL" && !entityId) {
    return {
      summary: `entityId is required for ${input.entityType}`,
      data: [],
      meta: {
        totalCount: 0,
        limit,
        offset,
        includeExtractedText: input.includeExtractedText,
      },
    };
  }

  const whereClause =
    input.entityType === "GLOBAL"
      ? eq(documents.entityType, "GLOBAL")
      : and(eq(documents.entityType, input.entityType), eq(documents.entityId, entityId!));

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        entityType: documents.entityType,
        entityId: documents.entityId,
        title: documents.title,
        description: documents.description,
        category: documents.category,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        ingestionStatus: documents.ingestionStatus,
        ingestionError: documents.ingestionError,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(whereClause)
      .orderBy(desc(documents.createdAt), desc(documents.id))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(documents).where(whereClause),
  ]);

  let extractedByDocumentId: Record<string, Array<{ pageNumber: number | null; modality: string; chunkText: string | null }>> = {};

  if (input.includeExtractedText && rows.length > 0) {
    const chunks = await db
      .select({
        documentId: documentChunks.documentId,
        pageNumber: documentChunks.pageNumber,
        modality: documentChunks.modality,
        chunkText: documentChunks.chunkText,
      })
      .from(documentChunks)
      .where(or(...rows.map((row) => eq(documentChunks.documentId, row.id)))!)
      .orderBy(asc(documentChunks.pageNumber), asc(documentChunks.createdAt))
      .limit(200);

    extractedByDocumentId = chunks.reduce<Record<string, Array<{ pageNumber: number | null; modality: string; chunkText: string | null }>>>(
      (acc, chunk) => {
        const current = acc[chunk.documentId] ?? [];
        if (current.length < 5) {
          current.push({
            pageNumber: chunk.pageNumber,
            modality: chunk.modality,
            chunkText:
              chunk.chunkText && chunk.chunkText.length > 1000
                ? `${chunk.chunkText.slice(0, 1000)}...`
                : chunk.chunkText,
          });
        }
        acc[chunk.documentId] = current;
        return acc;
      },
      {},
    );
  }

  const output = rows.map((row) => ({
    ...row,
    extractedPreview: input.includeExtractedText
      ? extractedByDocumentId[row.id] ?? []
      : undefined,
  }));

  return {
    summary: `Fetched ${rows.length} documents for ${input.entityType}`,
    data: output,
    meta: {
      totalCount: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
      includeExtractedText: input.includeExtractedText,
      entityType: input.entityType,
      entityId: entityId ?? null,
      truncated: input.includeExtractedText,
    },
  };
}

async function aggregateBusinessData(
  input: z.infer<typeof queryBusinessDataInputSchema>,
  context: ChatDbToolContext,
) {
  const filters = withContextFilters(input.filters, context);

  if (
    input.aggregate?.metric === "sumRevenue" ||
    input.aggregate?.metric === "sumEbitda"
  ) {
    return {
      summary:
        "sumRevenue/sumEbitda are not enabled yet. Use count/list operations.",
      data: null,
      meta: { unsupported: true },
    };
  }

  const groupBy = input.aggregate?.groupBy;
  if (!groupBy) {
    return {
      summary: "aggregate.groupBy is required for count aggregates.",
      data: null,
      meta: { unsupported: true },
    };
  }

  switch (input.entity) {
    case "leads": {
      if (groupBy !== "status") {
        return {
          summary: "For leads, only groupBy=status is supported.",
          data: null,
          meta: { unsupported: true },
        };
      }

      const whereClause = buildLeadWhere(input.query, filters);
      const rows = await db
        .select({ key: leads.status, value: count() })
        .from(leads)
        .where(whereClause)
        .groupBy(leads.status)
        .orderBy(asc(leads.status));

      return {
        summary: "Aggregated leads by status.",
        data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
        meta: { entity: input.entity, groupBy },
      };
    }

    case "dealOpportunities": {
      if (groupBy !== "status" && groupBy !== "stage") {
        return {
          summary: "For deal opportunities, groupBy must be status or stage.",
          data: null,
          meta: { unsupported: true },
        };
      }

      const conditions = [isNull(companies.deletedAt)];
      if (input.query) {
        const term = `%${input.query}%`;
        conditions.push(
          or(
            ilike(companies.name, term),
            ilike(dealOpportunities.dealTeaser, term),
            ilike(dealOpportunities.brokerage, term),
          )!,
        );
      }
      if (filters.companyId) conditions.push(eq(dealOpportunities.companyId, filters.companyId));
      if (filters.leadId) conditions.push(eq(dealOpportunities.leadId, filters.leadId));
      if (filters.status)
        conditions.push(
          eq(dealOpportunities.status, filters.status as typeof dealOpportunities.status._.data),
        );
      if (filters.stage)
        conditions.push(
          eq(dealOpportunities.stage, filters.stage as typeof dealOpportunities.stage._.data),
        );

      if (groupBy === "status") {
        const rows = await db
          .select({ key: dealOpportunities.status, value: count() })
          .from(dealOpportunities)
          .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
          .where(and(...conditions))
          .groupBy(dealOpportunities.status)
          .orderBy(asc(dealOpportunities.status));

        return {
          summary: "Aggregated deal opportunities by status.",
          data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
          meta: { entity: input.entity, groupBy },
        };
      }

      const rows = await db
        .select({ key: dealOpportunities.stage, value: count() })
        .from(dealOpportunities)
        .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
        .where(and(...conditions))
        .groupBy(dealOpportunities.stage)
        .orderBy(asc(dealOpportunities.stage));

      return {
        summary: "Aggregated deal opportunities by stage.",
        data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
        meta: { entity: input.entity, groupBy },
      };
    }

    case "documents": {
      if (groupBy !== "category" && groupBy !== "entityType") {
        return {
          summary: "For documents, groupBy must be category or entityType.",
          data: null,
          meta: { unsupported: true },
        };
      }

      const whereClause = buildDocumentsWhere(input.query, filters);

      if (groupBy === "category") {
        const rows = await db
          .select({ key: documents.category, value: count() })
          .from(documents)
          .where(whereClause)
          .groupBy(documents.category)
          .orderBy(asc(documents.category));

        return {
          summary: "Aggregated documents by category.",
          data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
          meta: { entity: input.entity, groupBy },
        };
      }

      const rows = await db
        .select({ key: documents.entityType, value: count() })
        .from(documents)
        .where(whereClause)
        .groupBy(documents.entityType)
        .orderBy(asc(documents.entityType));

      return {
        summary: "Aggregated documents by entity type.",
        data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
        meta: { entity: input.entity, groupBy },
      };
    }

    case "companies": {
      if (groupBy !== "industry" && groupBy !== "coverageStatus") {
        return {
          summary: "For companies, groupBy must be industry or coverageStatus.",
          data: null,
          meta: { unsupported: true },
        };
      }

      const whereClause = buildCompanyWhere(input.query, filters);

      if (groupBy === "industry") {
        const rows = await db
          .select({ key: companies.industry, value: count() })
          .from(companies)
          .where(whereClause)
          .groupBy(companies.industry)
          .orderBy(asc(companies.industry));

        return {
          summary: "Aggregated companies by industry.",
          data: rows.map((row) => ({ key: row.key ?? "Unknown", value: Number(row.value) })),
          meta: { entity: input.entity, groupBy },
        };
      }

      const rows = await db
        .select({ key: companies.coverageStatus, value: count() })
        .from(companies)
        .where(whereClause)
        .groupBy(companies.coverageStatus)
        .orderBy(asc(companies.coverageStatus));

      return {
        summary: "Aggregated companies by coverage status.",
        data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
        meta: { entity: input.entity, groupBy },
      };
    }

    case "investors": {
      if (groupBy !== "status" && groupBy !== "type") {
        return {
          summary: "For investors, groupBy must be status or type.",
          data: null,
          meta: { unsupported: true },
        };
      }

      const investorWhere = buildInvestorWhere(input.query, filters);
      const investorCol = groupBy === "status" ? investors.status : investors.type;
      const rows = await db
        .select({ key: investorCol, value: count() })
        .from(investors)
        .where(investorWhere ?? undefined)
        .groupBy(investorCol)
        .orderBy(asc(investorCol));

      return {
        summary: `Aggregated investors by ${groupBy}.`,
        data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
        meta: { entity: input.entity, groupBy },
      };
    }

    case "investorLeads": {
      if (groupBy !== "status") {
        return {
          summary: "For investor leads, only groupBy=status is supported.",
          data: null,
          meta: { unsupported: true },
        };
      }

      const leadWhere = buildInvestorLeadWhere(input.query, filters);
      const rows = await db
        .select({ key: investorLeads.status, value: count() })
        .from(investorLeads)
        .where(leadWhere ?? undefined)
        .groupBy(investorLeads.status)
        .orderBy(asc(investorLeads.status));

      return {
        summary: "Aggregated investor leads by status.",
        data: rows.map((row) => ({ key: row.key, value: Number(row.value) })),
        meta: { entity: input.entity, groupBy },
      };
    }

    case "themes":
    case "screeners": {
      return {
        summary: `Aggregate for ${input.entity} is not needed. Use count/list tools.`,
        data: null,
        meta: { unsupported: true },
      };
    }
  }
}

export async function queryBusinessData(
  input: z.infer<typeof queryBusinessDataInputSchema>,
  context: ChatDbToolContext,
) {
  switch (input.operation) {
    case "count":
      return getEntityCounts(
        {
          entity: input.entity,
          query: input.query,
          filters: input.filters,
        },
        context,
      );

    case "list":
      return listEntities(
        {
          entity: input.entity,
          query: input.query,
          filters: input.filters,
          limit: input.limit,
          offset: input.offset,
          sort: "newest",
        },
        context,
      );

    case "getById":
      if (!input.id) {
        return {
          summary: "id is required for getById operation",
          data: null,
          meta: { invalidRequest: true },
        };
      }
      return getEntityById(
        {
          entity: input.entity,
          id: input.id,
          includeRelated: true,
        },
        context,
      );

    case "aggregate":
      return aggregateBusinessData(input, context);
  }
}
