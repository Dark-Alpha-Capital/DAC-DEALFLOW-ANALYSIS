/**
 * Seeds themes, companies, deal opportunities (no leadId / legacyDealId — avoids FK and unique constraints).
 * Run: bun run ./scripts/seed-dummy-deal-pipeline.ts (from packages/db) or pnpm db:seed:dummy-deal-pipeline
 */
import { faker } from "@faker-js/faker";
import db, {
  companies,
  dealFinancialSnapshots,
  dealOpportunities,
  investorCompanyLinks,
  investors,
  themeCompanyCoverage,
  themes,
  type NewCompany,
  type NewDealFinancialSnapshot,
  type NewDealOpportunity,
  type NewInvestor,
  type NewInvestorCompanyLink,
  type NewTheme,
  type NewThemeCompanyCoverage,
} from "../index";

const THEME_COUNT = 8;
const COMPANY_COUNT = 75;
const INVESTOR_COUNT = 45;

const THEME_TEMPLATES: Array<Pick<NewTheme, "name" | "description" | "sector">> = [
  {
    name: "Vertical SaaS — SMB workflow",
    description:
      "Founder-led B2B software with durable NRR, underpenetrated channel partners, and clear upsell paths.",
    sector: "Software",
  },
  {
    name: "Healthcare services & enablement",
    description:
      "Outpatient, physician practice management, and HCIT adjacencies with payor diversification.",
    sector: "Healthcare",
  },
  {
    name: "Industrial distribution & MRO",
    description:
      "Regional distributors and service-light MRO platforms with consolidation and private-label upside.",
    sector: "Industrials",
  },
  {
    name: "Business services — essential",
    description:
      "Facility, environmental, and compliance-adjacent services with recurring routes and embedded switching costs.",
    sector: "Business services",
  },
  {
    name: "Specialty finance & payments",
    description:
      "Niche lending, merchant acquiring, and B2B payments with data advantages and low loss cycles.",
    sector: "Financial services",
  },
  {
    name: "Consumer & light manufacturing",
    description:
      "Branded niche consumer and light assembly with Amazon-resistant positioning and DTC optionality.",
    sector: "Consumer",
  },
  {
    name: "Logistics & asset-light transportation",
    description:
      "Brokerage, dedicated fleet lite, and last-mile adjacencies with network density thesis.",
    sector: "Transportation & logistics",
  },
  {
    name: "Tech-enabled professional services",
    description:
      "Engineering, environmental consulting, and IT services with utilization and rate lift levers.",
    sector: "Professional services",
  },
];

const SUB_INDUSTRY = [
  "commercial HVAC service",
  "dental practice support",
  "waste & recycling routes",
  "ERP implementation",
  "cybersecurity MSSP",
  "food ingredient distribution",
  "precision machining",
  "payroll & HCM reseller",
  "collision repair MSO",
  "third-party pharmacy benefits",
] as const;

const US_REGIONS = [
  "Southeast US",
  "Texas & Mountain West",
  "Great Lakes",
  "Mid-Atlantic",
  "Pacific Northwest",
  "Northeast corridor",
] as const;

const COVERAGE_STATUSES = [
  "UNCONTACTED",
  "CONTACTED",
  "IN_DISCUSSION",
  "UNDER_LOI",
  "CLOSED",
  "PASSED",
] as const;

const DEAL_STAGES = [
  "LISTED",
  "INITIAL_REVIEW",
  "SCREENED",
  "MEETING_HELD",
  "IOI_SUBMITTED",
  "LOI_SUBMITTED",
  "DILIGENCE",
  "CLOSED",
  "DEAD",
] as const;

const DEAL_STATUSES = [
  "AVAILABLE",
  "AVAILABLE",
  "AVAILABLE",
  "UNDER_CONTRACT",
  "SOLD",
  "NOT_SPECIFIED",
] as const;

const DEAL_TYPES = ["SCRAPED", "MANUAL", "AI_INFERRED"] as const;

const REVIEW_STATES = ["NOT_SEEN", "SEEN", "REVIEWED", "PUBLISHED"] as const;

const INVESTOR_TYPES = ["HNWI", "FAMILY_OFFICE", "INSTITUTION"] as const;
const INVESTOR_STATUSES = ["PROSPECT", "QUALIFIED", "ACTIVE", "INACTIVE"] as const;
const RISK_PROFILES = [
  "CONSERVATIVE",
  "MODERATE",
  "BALANCED",
  "GROWTH",
  "AGGRESSIVE",
] as const;
const LINK_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

const STAGE_FOCUS = [
  "Control buyouts",
  "Minority growth",
  "Carve-outs",
  "Founder-owned",
  "Recapitalizations",
] as const;

function uniqueNormalizedName(companyName: string, location: string): string {
  const base = `${companyName} ${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 72);
  return `${base || "co"}_${faker.string.alphanumeric(8).toLowerCase()}`;
}

function brokerageLabel(): string {
  const patterns = [
    () => `${faker.company.name()} Capital Markets`,
    () => `${faker.person.lastName()} & ${faker.person.lastName()} Advisors`,
    () => `${faker.location.city()} Middle Market Group`,
    () => `TriState ${faker.helpers.arrayElement(["M&A", "Capital", "Advisory"])}`,
  ];
  return faker.helpers.arrayElement(patterns)();
}

function dealTeaser(): string {
  const hooks = [
    "Proprietary intermediary process",
    "Limited auction — management aligned",
    "Portfolio company divestiture",
    "Founder seeking succession liquidity",
    "Recap to fund organic + M&A",
  ];
  return `${faker.helpers.arrayElement(hooks)}. ${faker.company.catchPhrase()} Platform in ${faker.helpers.arrayElement(SUB_INDUSTRY)} with ${faker.helpers.arrayElement(["recurring revenue", "route density", "long-tenured customers", "embedded software"])}.`;
}

async function main() {
  faker.seed(42_069);

  const themeRows: NewTheme[] = THEME_TEMPLATES.slice(0, THEME_COUNT).map((t) => ({
    ...t,
    status: faker.helpers.arrayElement(["ACTIVE", "ACTIVE", "ACTIVE", "PAUSED"] as const),
    capitalPriorityScore: faker.number.int({ min: 35, max: 95 }),
    confidenceScore: faker.number.int({ min: 40, max: 90 }),
  }));

  const insertedThemes = await db.insert(themes).values(themeRows).returning({ id: themes.id });
  const themeIds = insertedThemes.map((r) => r.id);

  const companyRows: NewCompany[] = Array.from({ length: COMPANY_COUNT }, () => {
    const assignTheme = faker.datatype.boolean({ probability: 0.65 });
    const themeId = assignTheme ? faker.helpers.arrayElement(themeIds) : undefined;
    const city = faker.location.city();
    const state = faker.location.state({ abbreviated: true });
    const location = `${city}, ${state}`;
    const niche = faker.helpers.arrayElement(SUB_INDUSTRY);
    const name = `${faker.person.lastName()} ${faker.helpers.arrayElement(["Holdings", "Group", "Partners", "Industries", "Services"])}`;
    const revenueTtm = faker.number.float({ min: 4, max: 85, fractionDigits: 2 });
    const ebitdaTtm = faker.number.float({
      min: revenueTtm * 0.08,
      max: revenueTtm * 0.28,
      fractionDigits: 2,
    });
    const grossMargin = faker.number.float({ min: 0.22, max: 0.62, fractionDigits: 3 });
    const employees = faker.number.int({ min: 12, max: 650 });

    return {
      name,
      normalizedName: uniqueNormalizedName(name, location),
      industry: niche,
      location,
      revenueEstimate: revenueTtm,
      ebitdaEstimate: ebitdaTtm,
      ebitdaMarginEstimate: revenueTtm > 0 ? ebitdaTtm / revenueTtm : undefined,
      recurringRevenuePct: faker.number.float({ min: 0.35, max: 0.92, fractionDigits: 2 }),
      customerConcentrationPct: faker.number.float({ min: 0.08, max: 0.45, fractionDigits: 2 }),
      founderAgeEstimate: faker.number.int({ min: 38, max: 72 }),
      businessModel: faker.helpers.arrayElement([
        "Asset-light service routes",
        "SaaS + services hybrid",
        "Distributor with value-add assembly",
        "Managed services contract",
      ]),
      employees,
      revenueTtm,
      ebitdaTtm,
      grossMargin,
      revenueCagr: faker.number.float({ min: 0.04, max: 0.28, fractionDigits: 3 }),
      totalClients: faker.number.int({ min: 40, max: 8000 }),
      top10Concentration: faker.number.float({ min: 0.12, max: 0.55, fractionDigits: 2 }),
      customerIndustries: faker.helpers.arrayElements(
        ["healthcare", "industrial", "retail", "education", "government"],
        { min: 1, max: 3 },
      ),
      revenueModelType: faker.helpers.arrayElement([
        "Subscription + usage",
        "Project + MSA",
        "Take-or-pay contracts",
        "Pass-through plus margin",
      ]),
      expansionModel: faker.helpers.arrayElement([
        "De novo branches",
        "Tuck-in M&A",
        "Cross-sell modules",
        "Geographic densification",
      ]),
      concentrationHigh: faker.datatype.boolean({ probability: 0.25 }),
      marginLow: faker.datatype.boolean({ probability: 0.2 }),
      vendorDependency: faker.datatype.boolean({ probability: 0.22 }),
      growthLevers: faker.helpers.arrayElements(
        ["pricing", "penetration", "cross-sell", "acquisition", "automation"],
        { min: 1, max: 3 },
      ),
      themeId,
      attractivenessScore: faker.number.int({ min: 25, max: 96 }),
      coverageStatus: faker.helpers.arrayElement(COVERAGE_STATUSES),
      firstSeenAt: faker.date.past({ years: 2 }),
      lastSeenAt: faker.date.recent({ days: 120 }),
    };
  });

  const insertedCompanies = await db
    .insert(companies)
    .values(companyRows)
    .returning({ id: companies.id, themeId: companies.themeId, coverageStatus: companies.coverageStatus });

  const dealOppRows: NewDealOpportunity[] = [];
  for (const c of insertedCompanies) {
    const oppCount = faker.datatype.boolean({ probability: 0.42 }) ? 2 : 1;
    for (let i = 0; i < oppCount; i++) {
      const revenue = faker.number.float({ min: 3.5, max: 90, fractionDigits: 2 });
      const ebitda = faker.number.float({
        min: revenue * 0.07,
        max: revenue * 0.3,
        fractionDigits: 2,
      });
      const multiple = faker.number.float({ min: 5.2, max: 11.5, fractionDigits: 2 });
      const askingPrice = ebitda > 0 ? ebitda * multiple : undefined;
      const ebitdaMargin = revenue > 0 ? ebitda / revenue : undefined;
      const impliedMultiple =
        askingPrice && ebitda > 0 ? askingPrice / ebitda : undefined;

      dealOppRows.push({
        companyId: c.id,
        sourceWebsite: faker.internet.url(),
        brokerage: brokerageLabel(),
        revenue,
        ebitda,
        ebitdaMargin,
        askingPrice,
        impliedMultiple,
        dealTeaser: dealTeaser(),
        description: faker.lorem.paragraph({ min: 1, max: 2 }),
        dealType: faker.helpers.arrayElement(DEAL_TYPES),
        stage: faker.helpers.arrayElement(DEAL_STAGES),
        status: faker.helpers.arrayElement(DEAL_STATUSES),
        tags: faker.helpers.arrayElements(
          ["platform", "add-on", "recurring revenue", "founder-led", "US-only", "asset-lite"],
          { min: 1, max: 4 },
        ),
        reviewState: faker.helpers.arrayElement(REVIEW_STATES),
        brokerFirstName: faker.person.firstName(),
        brokerLastName: faker.person.lastName(),
        brokerEmail: faker.internet.email(),
        brokerPhone: faker.phone.number(),
      });
    }
  }

  const insertedOpps = await db
    .insert(dealOpportunities)
    .values(dealOppRows)
    .returning({
      id: dealOpportunities.id,
      revenue: dealOpportunities.revenue,
      ebitda: dealOpportunities.ebitda,
      ebitdaMargin: dealOpportunities.ebitdaMargin,
      askingPrice: dealOpportunities.askingPrice,
      impliedMultiple: dealOpportunities.impliedMultiple,
    });

  const snapshotRows: NewDealFinancialSnapshot[] = insertedOpps.map((o) => ({
    dealOpportunityId: o.id,
    revenue: o.revenue ?? undefined,
    ebitda: o.ebitda ?? undefined,
    ebitdaMargin: o.ebitdaMargin ?? undefined,
    askingPrice: o.askingPrice ?? undefined,
    impliedMultiple: o.impliedMultiple ?? undefined,
    source: "LISTING",
    notes: "Seed snapshot at listing",
  }));

  await db.insert(dealFinancialSnapshots).values(snapshotRows);

  const coverageRows: NewThemeCompanyCoverage[] = insertedCompanies
    .filter((c): c is typeof c & { themeId: string } => c.themeId != null)
    .map((c) => ({
      themeId: c.themeId,
      companyId: c.id,
      coverageStatus: faker.helpers.arrayElement([
        c.coverageStatus,
        c.coverageStatus,
        faker.helpers.arrayElement(COVERAGE_STATUSES),
      ]),
      notes: faker.datatype.boolean({ probability: 0.35 })
        ? faker.lorem.sentence()
        : undefined,
      lastOutreachAt: faker.datatype.boolean({ probability: 0.4 })
        ? faker.date.recent({ days: 60 })
        : undefined,
    }));

  await db.insert(themeCompanyCoverage).values(coverageRows);

  const investorRows: NewInvestor[] = Array.from({ length: INVESTOR_COUNT }, () => {
    const minM = faker.number.int({ min: 1, max: 15 }) * 1_000_000;
    const maxM = minM + faker.number.int({ min: 5, max: 80 }) * 1_000_000;
    return {
      name: `${faker.person.lastName()} ${faker.helpers.arrayElement(["Capital", "Ventures", "Family Office", "Investments", "Holdings"])}`,
      type: faker.helpers.arrayElement(INVESTOR_TYPES),
      primaryContactName: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      geography: faker.helpers.arrayElement(US_REGIONS),
      minCheckSize: String(minM),
      maxCheckSize: String(maxM),
      sectorFocus: faker.helpers.arrayElements(
        ["Software", "Healthcare", "Industrials", "Business services", "Consumer"],
        { min: 1, max: 3 },
      ),
      stagePreference: faker.helpers.arrayElements([...STAGE_FOCUS], { min: 1, max: 3 }),
      riskProfile: faker.helpers.arrayElement(RISK_PROFILES),
      status: faker.helpers.arrayElement(INVESTOR_STATUSES),
    };
  });

  const insertedInvestors = await db.insert(investors).values(investorRows).returning({ id: investors.id });

  const companyIds = insertedCompanies.map((c) => c.id);
  const linkKeySet = new Set<string>();
  const linkRows: NewInvestorCompanyLink[] = [];

  for (const { id: investorId } of insertedInvestors) {
    const targetCount = faker.number.int({ min: 1, max: 4 });
    const picks = faker.helpers.shuffle([...companyIds]).slice(0, targetCount);
    for (const companyId of picks) {
      const key = `${investorId}:${companyId}`;
      if (linkKeySet.has(key)) continue;
      linkKeySet.add(key);
      linkRows.push({
        investorId,
        companyId,
        status: faker.helpers.arrayElement(LINK_STATUSES),
        notes: faker.datatype.boolean({ probability: 0.45 })
          ? faker.lorem.sentence()
          : undefined,
      });
    }
  }

  await db.insert(investorCompanyLinks).values(linkRows);

  console.log(
    `Seeded ${themeIds.length} themes, ${insertedCompanies.length} companies, ${insertedOpps.length} deal opportunities, ${snapshotRows.length} deal financial snapshots, ${coverageRows.length} theme–company coverage rows, ${insertedInvestors.length} investors, ${linkRows.length} investor–company links.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
