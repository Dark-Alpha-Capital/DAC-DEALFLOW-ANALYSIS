import { and, eq, isNull } from "drizzle-orm";
import { db } from "..";
import { investmentCriteriaProfiles } from "../schema";

export async function upsertActiveInvestmentCriteriaProfile(
  key: string,
  organizationId: string | null,
  values: Omit<typeof investmentCriteriaProfiles.$inferInsert, "key">,
) {
  await db
    .update(investmentCriteriaProfiles)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(investmentCriteriaProfiles.key, key),
        eq(investmentCriteriaProfiles.isActive, true),
        organizationId
          ? eq(investmentCriteriaProfiles.organizationId, organizationId)
          : isNull(investmentCriteriaProfiles.organizationId),
      ),
    );

  const [created] = await db
    .insert(investmentCriteriaProfiles)
    .values({
      ...values,
      key,
      organizationId,
      isActive: true,
    })
    .returning();

  return created ?? null;
}
