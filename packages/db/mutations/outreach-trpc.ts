import { db } from "..";
import { outreach, dealOpportunities } from "../schema";
import { eq } from "drizzle-orm";

export async function getDealOpportunityIdAndCompanyId(dealOpportunityId: string) {
  const [row] = await db
    .select({
      id: dealOpportunities.id,
      companyId: dealOpportunities.companyId,
    })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.id, dealOpportunityId))
    .limit(1);
  return row ?? null;
}

export async function insertOutreachRow(input: {
  companyId: string | null;
  dealOpportunityId: string | null;
  type: (typeof outreach.$inferSelect)["type"];
  outcome: string | null;
  notes: string | null;
  createdById: string;
}) {
  const [added] = await db.insert(outreach).values(input).returning();
  return added ?? null;
}
