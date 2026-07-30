import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../index";
import {
  investmentCriteriaProfiles,
  type InvestmentCriteriaProfile,
} from "../schema";

export async function getActiveInvestmentCriteriaProfile(
  key = "default",
  organizationId?: string | null,
): Promise<InvestmentCriteriaProfile | null> {
  const [profile] = await db
    .select()
    .from(investmentCriteriaProfiles)
    .where(
      and(
        eq(investmentCriteriaProfiles.key, key),
        eq(investmentCriteriaProfiles.isActive, true),
        organizationId
          ? eq(investmentCriteriaProfiles.organizationId, organizationId)
          : isNull(investmentCriteriaProfiles.organizationId),
      ),
    )
    .orderBy(
      desc(investmentCriteriaProfiles.updatedAt),
      desc(investmentCriteriaProfiles.createdAt),
    )
    .limit(1);

  return profile ?? null;
}
