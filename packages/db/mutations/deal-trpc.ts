import { db } from "..";
import {
  deals,
  dealOpportunities,
  dealOpportunityThemes,
  dealOpportunityCompanyLinks,
  dealOpportunityScreenings,
  investorDealOpportunityLinks,
  aiScreenings,
  documents,
  themes,
} from "../schema";
import type { ReviewState } from "../enums";
import { and, eq, isNull } from "drizzle-orm";

export async function insertDealOpportunityCimDocument(
  values: typeof documents.$inferInsert,
) {
  const [documentRecord] = await db
    .insert(documents)
    .values(values)
    .returning({ id: documents.id });
  return documentRecord ?? null;
}

export async function insertManualDealRow(values: typeof deals.$inferInsert) {
  const [addedDeal] = await db.insert(deals).values(values).returning();
  return addedDeal ?? null;
}

export async function insertDealOpportunityRow(
  values: typeof dealOpportunities.$inferInsert,
) {
  const [added] = await db.insert(dealOpportunities).values(values).returning();
  return added ?? null;
}

export async function insertDealOpportunityCompanyLink(
  values: typeof dealOpportunityCompanyLinks.$inferInsert,
) {
  await db.insert(dealOpportunityCompanyLinks).values(values);
}

export async function updateDealOpportunityCompanyId(
  dealOpportunityId: string,
  companyId: string | null,
) {
  await db
    .update(dealOpportunities)
    .set({ companyId })
    .where(eq(dealOpportunities.id, dealOpportunityId));
}

export async function deleteDealOpportunityCompanyLinkById(linkId: string) {
  const [removed] = await db
    .delete(dealOpportunityCompanyLinks)
    .where(eq(dealOpportunityCompanyLinks.id, linkId))
    .returning();
  return removed ?? null;
}

export async function insertInvestorDealOpportunityLink(
  values: typeof investorDealOpportunityLinks.$inferInsert,
) {
  await db.insert(investorDealOpportunityLinks).values(values);
}

export async function deleteInvestorDealOpportunityLinkById(linkId: string) {
  const [removed] = await db
    .delete(investorDealOpportunityLinks)
    .where(eq(investorDealOpportunityLinks.id, linkId))
    .returning();
  return removed ?? null;
}

export async function createDealOpportunityQuickTx(input: {
  userId: string;
  themeId: string | null;
  fields: Omit<
    typeof dealOpportunities.$inferInsert,
    "id" | "createdAt" | "updatedAt"
  >;
}) {
  return db.transaction(async (tx) => {
    const normalizedThemeId = input.themeId?.trim() || null;
    if (normalizedThemeId) {
      const [theme] = await tx
        .select({ id: themes.id })
        .from(themes)
        .where(and(eq(themes.id, normalizedThemeId), isNull(themes.deletedAt)))
        .limit(1);
      if (!theme) {
        throw new Error("THEME_NOT_FOUND");
      }
    }

    const [opp] = await tx
      .insert(dealOpportunities)
      .values(input.fields)
      .returning();

    if (!opp) throw new Error("Failed to create deal opportunity");

    if (normalizedThemeId) {
      await tx.insert(dealOpportunityThemes).values({
        dealOpportunityId: opp.id,
        themeId: normalizedThemeId,
        isPrimary: true,
      });
    }

    return { opp };
  });
}

export async function updateDealOpportunityStageById(id: string, stage: string) {
  await db
    .update(dealOpportunities)
    .set({ stage })
    .where(eq(dealOpportunities.id, id));
}

export async function deleteDeterministicScreeningForDealOpportunity(
  dealOpportunityId: string,
) {
  await db
    .delete(dealOpportunityScreenings)
    .where(
      eq(dealOpportunityScreenings.dealOpportunityId, dealOpportunityId),
    );
}

export async function insertQualitativeAiScreeningRow(
  values: typeof aiScreenings.$inferInsert,
) {
  await db.insert(aiScreenings).values(values);
}

export async function updateDealOpportunityListingFields(
  id: string,
  data: {
    companyId: string | null;
    leadId: string | null;
    sourceWebsite: string | null;
    brokerage: string | null;
    title: string | null;
    dealTeaser: string | null;
    description: string | null;
    brokerFirstName: string | null;
    brokerLastName: string | null;
    brokerEmail: string | null;
    brokerPhone: string | null;
    brokerLinkedIn: string | null;
  },
) {
  await db.update(dealOpportunities).set(data).where(eq(dealOpportunities.id, id));
}

export async function deleteDealOpportunityRow(id: string) {
  await db.delete(dealOpportunities).where(eq(dealOpportunities.id, id));
}

export async function updateLegacyDealRow(
  id: string,
  data: {
    title: string;
    dealCaption: string;
    firstName: string;
    lastName: string;
    email: string;
    linkedinUrl: string | null;
    workPhone: string | null;
    revenue: number;
    ebitda: number;
    ebitdaMargin: number;
    grossRevenue: number | null;
    companyLocation: string;
    brokerage: string;
    sourceWebsite: string;
    industry: string;
    askingPrice: number;
  },
) {
  await db.update(deals).set(data).where(eq(deals.id, id));
}

export async function updateLegacyDealTags(dealId: string, tags: string[]) {
  await db.update(deals).set({ tags }).where(eq(deals.id, dealId));
}

export async function updateDealOpportunityReviewAndStatus(
  id: string,
  reviewState: ReviewState,
  status: (typeof dealOpportunities.$inferSelect)["status"],
) {
  await db
    .update(dealOpportunities)
    .set({ reviewState, status })
    .where(eq(dealOpportunities.id, id));
}

export async function updateLegacyDealReviewAndStatus(
  id: string,
  reviewState: ReviewState,
  status: (typeof deals.$inferSelect)["status"],
) {
  await db
    .update(deals)
    .set({ reviewState, status })
    .where(eq(deals.id, id));
}

export async function updateDealOpportunityBitrixFields(
  dealOpportunityId: string,
  fields: {
    bitrixId: string;
    bitrixLink: string | null;
    bitrixCreatedAt: Date;
  },
) {
  await db
    .update(dealOpportunities)
    .set(fields)
    .where(eq(dealOpportunities.id, dealOpportunityId));
}

export async function insertDealOpportunityFromBitrixImport(
  values: typeof dealOpportunities.$inferInsert,
) {
  const [added] = await db
    .insert(dealOpportunities)
    .values(values)
    .returning();
  return added ?? null;
}
