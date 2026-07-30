import db, { and, desc, eq, isNull } from "@repo/db";
import { DARK_ALPHA_CRITERIA } from "@repo/ai-core";
import { upsertActiveInvestmentCriteriaProfile } from "@repo/db/mutations";
import { getActiveInvestmentCriteriaProfile } from "@repo/db/queries";
import type { DealScreeningStatus } from "@repo/db/enums";
import {
  companies,
  dealFinancialSnapshots,
  dealOpportunities,
  dealOpportunityScreenings,
  leads,
  leadScreenings,
  type InvestmentCriteriaPreferredIndustry,
  type InvestmentCriteriaRevenueBand,
  type DealOpportunityScreening,
  type LeadScreening,
} from "@repo/db/schema";

export type DealScreeningCriteriaProfile = {
  key: string;
  version: string;
  firmName: string;
  ebitdaMin: number;
  ebitdaMax: number;
  revenueMin: number | null;
  revenueMax: number | null;
  ebitdaMarginMin: number | null;
  preferredIndustries: InvestmentCriteriaPreferredIndustry[];
  excludedIndustries: string[];
  geographies: string[];
  ownershipNotes: string | null;
  customerConcentrationIdealMax: number | null;
  customerConcentrationWarnAbove: number | null;
  positiveScreensMd: string | null;
  negativeScreensMd: string | null;
  weights: {
    ebitdaFit: number;
    revenue: number;
    industry: number;
  };
  revenueScoreWhenMissing: number;
  revenueScoreBands: InvestmentCriteriaRevenueBand[];
  criteriaNarrativeMd: string;
  icRubricMd: string | null;
};

export type DarkAlphaCriteriaProfile = DealScreeningCriteriaProfile;

const DEFAULT_REVENUE_SCORE_BANDS: InvestmentCriteriaRevenueBand[] = [
  { min: 5_000_000, max: 50_000_000, score: 100 },
  { min: 3_000_000, max: 5_000_000, score: 80 },
  { min: 50_000_000, max: 75_000_000, score: 80 },
  { min: 1_000_000, max: 3_000_000, score: 60 },
  { min: 75_000_000, max: 100_000_000, score: 60 },
];

export const DEFAULT_CRITERIA_SEED: DealScreeningCriteriaProfile = {
  key: "dark-alpha-screening",
  version: "1",
  firmName: "Dark Alpha Capital",
  ebitdaMin: 1_000_000,
  ebitdaMax: 10_000_000,
  revenueMin: 1_000_000,
  revenueMax: 100_000_000,
  ebitdaMarginMin: null,
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
  excludedIndustries: [],
  geographies: ["US", "North America"],
  ownershipNotes:
    "Founder / family-owned, management willing to stay or transition.",
  customerConcentrationIdealMax: 25,
  customerConcentrationWarnAbove: 40,
  positiveScreensMd: [
    "- Stable / growing EBITDA for 3+ years.",
    "- Recurring or subscription revenue (>30% of total).",
    "- Pricing power (inflation pass-through, evidence of price increases without churn).",
    "- Fragmented industry (roll-up / synergy opportunity).",
    "- Operating-partner / management team strength.",
    "- Tech-enabled upside: RPA, AI, ERP consolidation, partnerships.",
    "- Synergies with existing portfolio companies.",
  ].join("\n"),
  negativeScreensMd: [
    "- Pure cyclical commodity exposure, asset-heavy project businesses without recurring revenue.",
    "- Regulatory-binary businesses (single license risk).",
    "- Highly concentrated customer (>40% single customer) without contractual lock-in.",
  ].join("\n"),
  weights: {
    ebitdaFit: 0.5,
    revenue: 0.2,
    industry: 0.3,
  },
  revenueScoreWhenMissing: 50,
  revenueScoreBands: DEFAULT_REVENUE_SCORE_BANDS,
  criteriaNarrativeMd: DARK_ALPHA_CRITERIA,
  icRubricMd: null,
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
  profile: DealScreeningCriteriaProfile,
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

function getEbitdaFitScore(
  ebitda: number,
  profile: DealScreeningCriteriaProfile,
) {
  const midpoint = (profile.ebitdaMin + profile.ebitdaMax) / 2;
  const halfRange = (profile.ebitdaMax - profile.ebitdaMin) / 2;
  const distanceRatio = Math.abs(ebitda - midpoint) / halfRange;
  return clampScore(100 - distanceRatio * 60);
}

function getRevenueScore(
  revenue: number | null,
  profile: DealScreeningCriteriaProfile,
) {
  if (revenue == null) {
    return profile.revenueScoreWhenMissing;
  }
  for (const band of profile.revenueScoreBands) {
    const meetsMin = band.min == null || revenue >= band.min;
    const belowMax = band.max == null || revenue <= band.max;
    if (meetsMin && belowMax) {
      return band.score;
    }
  }
  return 40;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}

function formatRange(min: number, max: number) {
  return `${formatCompactCurrency(min)} to ${formatCompactCurrency(max)}`;
}

function fromDbProfile(
  profile:
    | Awaited<ReturnType<typeof getActiveInvestmentCriteriaProfile>>
    | null,
): DealScreeningCriteriaProfile | null {
  if (!profile) return null;

  return {
    key: profile.key,
    version: profile.version,
    firmName: profile.firmName,
    ebitdaMin: profile.ebitdaMin,
    ebitdaMax: profile.ebitdaMax,
    revenueMin: profile.revenueMin,
    revenueMax: profile.revenueMax,
    ebitdaMarginMin: profile.ebitdaMarginMin,
    preferredIndustries: profile.preferredIndustries,
    excludedIndustries: profile.excludedIndustries,
    geographies: profile.geographies,
    ownershipNotes: profile.ownershipNotes,
    customerConcentrationIdealMax: profile.customerConcentrationIdealMax,
    customerConcentrationWarnAbove: profile.customerConcentrationWarnAbove,
    positiveScreensMd: profile.positiveScreensMd,
    negativeScreensMd: profile.negativeScreensMd,
    weights: {
      ebitdaFit: profile.weightEbitdaFit,
      revenue: profile.weightRevenue,
      industry: profile.weightIndustry,
    },
    revenueScoreWhenMissing: profile.revenueScoreWhenMissing,
    revenueScoreBands: profile.revenueScoreBands,
    criteriaNarrativeMd: profile.criteriaNarrativeMd,
    icRubricMd: profile.icRubricMd,
  };
}

export async function getDefaultCriteriaProfile(organizationId?: string | null) {
  const profile = await getActiveInvestmentCriteriaProfile(
    "default",
    organizationId,
  );
  return fromDbProfile(profile) ?? DEFAULT_CRITERIA_SEED;
}

export async function ensureDefaultCriteriaProfile(organizationId?: string | null) {
  const existing = await getActiveInvestmentCriteriaProfile(
    "default",
    organizationId,
  );
  if (existing) {
    return fromDbProfile(existing) ?? DEFAULT_CRITERIA_SEED;
  }

  const created = await upsertActiveInvestmentCriteriaProfile(
    "default",
    organizationId ?? null,
    {
    version: DEFAULT_CRITERIA_SEED.version,
    firmName: DEFAULT_CRITERIA_SEED.firmName,
    ebitdaMin: DEFAULT_CRITERIA_SEED.ebitdaMin,
    ebitdaMax: DEFAULT_CRITERIA_SEED.ebitdaMax,
    revenueMin: DEFAULT_CRITERIA_SEED.revenueMin,
    revenueMax: DEFAULT_CRITERIA_SEED.revenueMax,
    ebitdaMarginMin: DEFAULT_CRITERIA_SEED.ebitdaMarginMin,
    preferredIndustries: DEFAULT_CRITERIA_SEED.preferredIndustries,
    excludedIndustries: DEFAULT_CRITERIA_SEED.excludedIndustries,
    geographies: DEFAULT_CRITERIA_SEED.geographies,
    ownershipNotes: DEFAULT_CRITERIA_SEED.ownershipNotes,
    customerConcentrationIdealMax:
      DEFAULT_CRITERIA_SEED.customerConcentrationIdealMax,
    customerConcentrationWarnAbove:
      DEFAULT_CRITERIA_SEED.customerConcentrationWarnAbove,
    positiveScreensMd: DEFAULT_CRITERIA_SEED.positiveScreensMd,
    negativeScreensMd: DEFAULT_CRITERIA_SEED.negativeScreensMd,
    weightEbitdaFit: DEFAULT_CRITERIA_SEED.weights.ebitdaFit,
    weightRevenue: DEFAULT_CRITERIA_SEED.weights.revenue,
    weightIndustry: DEFAULT_CRITERIA_SEED.weights.industry,
    revenueScoreWhenMissing: DEFAULT_CRITERIA_SEED.revenueScoreWhenMissing,
    revenueScoreBands: DEFAULT_CRITERIA_SEED.revenueScoreBands,
    criteriaNarrativeMd: DEFAULT_CRITERIA_SEED.criteriaNarrativeMd,
    icRubricMd: DEFAULT_CRITERIA_SEED.icRubricMd,
    },
  );

  return fromDbProfile(created) ?? DEFAULT_CRITERIA_SEED;
}

export function screenDeal(
  input: DealScreeningInput,
  profile: DealScreeningCriteriaProfile,
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
    reasons.push(
      `EBITDA below target range (${formatRange(profile.ebitdaMin, profile.ebitdaMax)})`,
    );
  }
  if (ebitda > profile.ebitdaMax) {
    reasons.push(
      `EBITDA above target range (${formatRange(profile.ebitdaMin, profile.ebitdaMax)})`,
    );
  }

  const industryMatch = matchPreferredIndustry(
    input.industry as string,
    profile,
  );
  if (!industryMatch) {
    reasons.push("Industry is outside preferred sectors");
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
  const revenueScore = getRevenueScore(input.revenue, profile);
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
    companyName:
      company.name?.trim() ||
      row.opportunity.dealTeaser?.trim() ||
      null,
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
  profile?: DealScreeningCriteriaProfile,
  organizationId?: string | null,
) {
  const input = await buildDealScreeningInput(dealOpportunityId);
  if (!input) {
    return null;
  }

  const resolvedProfile =
    profile ?? (await getDefaultCriteriaProfile(organizationId));
  const result = screenDeal(input, resolvedProfile);

  const values = toScreeningRecord(dealOpportunityId, result);

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

export async function upsertLeadScreening(
  leadId: string,
  profile?: DealScreeningCriteriaProfile,
  organizationId?: string | null,
) {
  const input = await buildLeadScreeningInput(leadId);
  if (!input) {
    return null;
  }

  const resolvedProfile =
    profile ?? (await getDefaultCriteriaProfile(organizationId));
  const result = screenDeal(input, resolvedProfile);
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

export async function rescreenAllDealOpportunities(organizationId?: string | null) {
  const profile = await getDefaultCriteriaProfile(organizationId);
  const orgFilter = organizationId
    ? eq(dealOpportunities.organizationId, organizationId)
    : undefined;
  const rows = await db
    .select({ id: dealOpportunities.id })
    .from(dealOpportunities)
    .leftJoin(companies, eq(dealOpportunities.companyId, companies.id))
    .where(
      orgFilter
        ? and(orgFilter, isNull(companies.deletedAt))
        : isNull(companies.deletedAt),
    )
    .orderBy(desc(dealOpportunities.createdAt), desc(dealOpportunities.id));

  const results = [];
  for (const row of rows) {
    const screening = await upsertDealOpportunityScreening(
      row.id,
      profile,
      organizationId,
    );
    if (screening) {
      results.push(screening);
    }
  }
  return results;
}
