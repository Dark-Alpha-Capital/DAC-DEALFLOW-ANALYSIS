import db, { and, desc, eq, isNull } from "@repo/db";
import type { DealScreeningStatus } from "@repo/db/enums";
import {
  companies,
  dealFinancialSnapshots,
  dealOpportunities,
  dealOpportunityScreenings,
  leads,
  leadScreenings,
  type DealOpportunityScreening,
  type LeadScreening,
} from "@repo/db/schema";

type PreferredIndustry = {
  label: string;
  aliases: string[];
};

export type DarkAlphaCriteriaProfile = {
  key: string;
  version: string;
  ebitdaMin: number;
  ebitdaMax: number;
  preferredIndustries: PreferredIndustry[];
  weights: {
    ebitdaFit: number;
    revenue: number;
    industry: number;
  };
};

export const DARK_ALPHA_CRITERIA_PROFILE: DarkAlphaCriteriaProfile = {
  key: "dark-alpha-screening",
  version: "1",
  ebitdaMin: 1_000_000,
  ebitdaMax: 10_000_000,
  preferredIndustries: [
    {
      label: "Healthcare",
      aliases: [
        "healthcare",
        "health care",
        "medical",
        "health services",
        "healthcare services",
      ],
    },
    {
      label: "Aerospace and Defense",
      aliases: [
        "aerospace and defense",
        "aerospace & defense",
        "aerospace",
        "defense",
        "defence",
      ],
    },
    {
      label: "Technology",
      aliases: [
        "technology",
        "tech",
        "software",
        "it services",
        "information technology",
        "saas",
      ],
    },
    {
      label: "Business Services",
      aliases: [
        "business services",
        "professional services",
        "commercial services",
        "b2b services",
      ],
    },
    {
      label: "Manufacturing",
      aliases: [
        "manufacturing",
        "industrial manufacturing",
        "contract manufacturing",
      ],
    },
  ],
  weights: {
    ebitdaFit: 0.5,
    revenue: 0.2,
    industry: 0.3,
  },
};

export type DealScreeningInput = {
  dealOpportunityId: string;
  companyId: string | null;
  companyName: string | null;
  ebitda: number | null;
  revenue: number | null;
  industry: string | null;
  location: string | null;
};

export type DealScreeningResult = {
  status: DealScreeningStatus;
  passed: boolean;
  reasons: string[];
  score: number | null;
  ebitdaFitScore: number | null;
  revenueScore: number | null;
  industryScore: number | null;
  matchedIndustry: string | null;
  profileKey: string;
  profileVersion: string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchPreferredIndustry(
  industry: string,
  profile: DarkAlphaCriteriaProfile,
) {
  const normalized = normalizeText(industry);

  for (const preferred of profile.preferredIndustries) {
    const aliases = [preferred.label, ...preferred.aliases];

    for (const alias of aliases) {
      const normalizedAlias = normalizeText(alias);
      if (
        normalized === normalizedAlias ||
        normalized.startsWith(`${normalizedAlias} `) ||
        normalized.endsWith(` ${normalizedAlias}`) ||
        normalized.includes(` ${normalizedAlias} `)
      ) {
        return {
          label: preferred.label,
          score: normalized === normalizedAlias ? 100 : 90,
        };
      }
    }
  }

  return null;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getEbitdaFitScore(ebitda: number, profile: DarkAlphaCriteriaProfile) {
  const midpoint = (profile.ebitdaMin + profile.ebitdaMax) / 2;
  const halfRange = (profile.ebitdaMax - profile.ebitdaMin) / 2;
  const distanceRatio = Math.abs(ebitda - midpoint) / halfRange;
  return clampScore(100 - distanceRatio * 60);
}

function getRevenueScore(revenue: number | null) {
  if (revenue == null) {
    return 50;
  }
  if (revenue >= 5_000_000 && revenue <= 50_000_000) {
    return 100;
  }
  if (
    (revenue >= 3_000_000 && revenue < 5_000_000) ||
    (revenue > 50_000_000 && revenue <= 75_000_000)
  ) {
    return 80;
  }
  if (
    (revenue >= 1_000_000 && revenue < 3_000_000) ||
    (revenue > 75_000_000 && revenue <= 100_000_000)
  ) {
    return 60;
  }
  return 40;
}

export function screenDeal(
  input: DealScreeningInput,
  profile: DarkAlphaCriteriaProfile = DARK_ALPHA_CRITERIA_PROFILE,
): DealScreeningResult {
  const reasons: string[] = [];

  if (input.ebitda == null) {
    reasons.push("Missing EBITDA");
  }
  if (!input.industry?.trim()) {
    reasons.push("Missing industry");
  }

  if (reasons.length > 0) {
    return {
      status: "INCOMPLETE",
      passed: false,
      reasons,
      score: null,
      ebitdaFitScore: null,
      revenueScore: null,
      industryScore: null,
      matchedIndustry: null,
      profileKey: profile.key,
      profileVersion: profile.version,
    };
  }

  const ebitda = input.ebitda as number;
  if (ebitda < profile.ebitdaMin) {
    reasons.push("EBITDA below $1M target range");
  }
  if (ebitda > profile.ebitdaMax) {
    reasons.push("EBITDA above $10M target range");
  }

  const industryMatch = matchPreferredIndustry(
    input.industry as string,
    profile,
  );
  if (!industryMatch) {
    reasons.push("Industry is outside Dark Alpha preferred sectors");
  }

  if (reasons.length > 0) {
    return {
      status: "FAIL",
      passed: false,
      reasons,
      score: null,
      ebitdaFitScore: null,
      revenueScore: null,
      industryScore: null,
      matchedIndustry: industryMatch?.label ?? null,
      profileKey: profile.key,
      profileVersion: profile.version,
    };
  }

  const ebitdaFitScore = getEbitdaFitScore(ebitda, profile);
  const revenueScore = getRevenueScore(input.revenue);
  const industryScore = industryMatch?.score ?? 0;
  const score = clampScore(
    ebitdaFitScore * profile.weights.ebitdaFit +
      revenueScore * profile.weights.revenue +
      industryScore * profile.weights.industry,
  );

  return {
    status: "PASS",
    passed: true,
    reasons: [],
    score,
    ebitdaFitScore,
    revenueScore,
    industryScore,
    matchedIndustry: industryMatch?.label ?? null,
    profileKey: profile.key,
    profileVersion: profile.version,
  };
}

export async function buildDealScreeningInput(
  dealOpportunityId: string,
): Promise<DealScreeningInput | null> {
  const [row] = await db
    .select({
      opportunity: dealOpportunities,
      company: {
        id: companies.id,
        name: companies.name,
        revenueEstimate: companies.revenueEstimate,
        ebitdaEstimate: companies.ebitdaEstimate,
        industry: companies.industry,
        location: companies.location,
      },
    })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(
      and(
        eq(dealOpportunities.id, dealOpportunityId),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [latestSnapshot] = await db
    .select()
    .from(dealFinancialSnapshots)
    .where(eq(dealFinancialSnapshots.dealOpportunityId, dealOpportunityId))
    .orderBy(
      desc(dealFinancialSnapshots.createdAt),
      desc(dealFinancialSnapshots.id),
    )
    .limit(1);

  const company = row.company ?? {
    id: null,
    name: null,
    revenueEstimate: null,
    ebitdaEstimate: null,
    industry: null,
    location: null,
  };

  return {
    dealOpportunityId: row.opportunity.id,
    companyId: company.id,
    companyName: company.name,
    ebitda:
      latestSnapshot?.ebitda ??
      row.opportunity.ebitda ??
      company.ebitdaEstimate ??
      null,
    revenue:
      latestSnapshot?.revenue ??
      row.opportunity.revenue ??
      company.revenueEstimate ??
      null,
    industry: company.industry ?? null,
    location: company.location ?? null,
  };
}

export async function buildLeadScreeningInput(
  leadId: string,
): Promise<DealScreeningInput | null> {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
    .limit(1);

  if (!lead) {
    return null;
  }

  const name =
    lead.normalizedCompanyName?.trim() || lead.rawTitle?.trim() || null;

  return {
    dealOpportunityId: leadId,
    companyId: null,
    companyName: name,
    ebitda: lead.ebitda ?? null,
    revenue: lead.revenue ?? null,
    industry: lead.rawIndustry?.trim() || null,
    location: lead.companyLocation?.trim() || null,
  };
}

function toScreeningRecord(
  dealOpportunityId: string,
  result: DealScreeningResult,
): typeof dealOpportunityScreenings.$inferInsert {
  const now = new Date();

  return {
    dealOpportunityId,
    status: result.status,
    passed: result.passed,
    reasons: result.reasons,
    score: result.score,
    ebitdaFitScore: result.ebitdaFitScore,
    revenueScore: result.revenueScore,
    industryScore: result.industryScore,
    profileKey: result.profileKey,
    profileVersion: result.profileVersion,
    screenedAt: now,
    updatedAt: now,
  };
}

export async function upsertDealOpportunityScreening(
  dealOpportunityId: string,
) {
  const input = await buildDealScreeningInput(dealOpportunityId);
  if (!input) {
    return null;
  }

  const result = screenDeal(input);

  const values = toScreeningRecord(dealOpportunityId, result);

  console.log("screening result", values);

  const [saved] = await db
    .insert(dealOpportunityScreenings)
    .values(values)
    .onConflictDoUpdate({
      target: dealOpportunityScreenings.dealOpportunityId,
      set: values,
    })
    .returning();

  return saved;
}

function toLeadScreeningRecord(
  leadId: string,
  result: DealScreeningResult,
): typeof leadScreenings.$inferInsert {
  const now = new Date();

  return {
    leadId,
    status: result.status,
    passed: result.passed,
    reasons: result.reasons,
    score: result.score,
    ebitdaFitScore: result.ebitdaFitScore,
    revenueScore: result.revenueScore,
    industryScore: result.industryScore,
    profileKey: result.profileKey,
    profileVersion: result.profileVersion,
    screenedAt: now,
    updatedAt: now,
  };
}

export async function upsertLeadScreening(leadId: string) {
  const input = await buildLeadScreeningInput(leadId);
  if (!input) {
    return null;
  }

  const result = screenDeal(input);
  const values = toLeadScreeningRecord(leadId, result);

  const [saved] = await db
    .insert(leadScreenings)
    .values(values)
    .onConflictDoUpdate({
      target: leadScreenings.leadId,
      set: values,
    })
    .returning();

  return saved;
}

export async function getDeterministicScreeningByLeadId(
  leadId: string,
): Promise<LeadScreening | null> {
  const [screening] = await db
    .select()
    .from(leadScreenings)
    .where(eq(leadScreenings.leadId, leadId))
    .orderBy(desc(leadScreenings.screenedAt))
    .limit(1);

  return screening ?? null;
}

export async function getDeterministicScreeningByDealOpportunityId(
  dealOpportunityId: string,
): Promise<DealOpportunityScreening | null> {
  const [screening] = await db
    .select()
    .from(dealOpportunityScreenings)
    .where(eq(dealOpportunityScreenings.dealOpportunityId, dealOpportunityId))
    .orderBy(desc(dealOpportunityScreenings.screenedAt))
    .limit(1);

  return screening ?? null;
}

export async function rescreenAllDealOpportunities() {
  const rows = await db
    .select({ id: dealOpportunities.id })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(isNull(companies.deletedAt))
    .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id));

  const results = [];
  for (const row of rows) {
    const screening = await upsertDealOpportunityScreening(row.id);
    if (screening) {
      results.push(screening);
    }
  }
  return results;
}
