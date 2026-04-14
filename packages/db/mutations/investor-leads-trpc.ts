import { db } from "..";
import { investorInteractions, investorLeads, investors } from "../schema";
import { desc, eq } from "drizzle-orm";

export async function insertInvestorLeadRow(values: typeof investorLeads.$inferInsert) {
  const [added] = await db.insert(investorLeads).values(values).returning();
  return added ?? null;
}

export async function listInvestorLeadInteractions(investorLeadId: string) {
  return db
    .select()
    .from(investorInteractions)
    .where(eq(investorInteractions.investorLeadId, investorLeadId))
    .orderBy(desc(investorInteractions.createdAt));
}

export async function insertInvestorLeadInteraction(
  values: typeof investorInteractions.$inferInsert,
) {
  const [added] = await db.insert(investorInteractions).values(values).returning();
  return added ?? null;
}

export async function updateInvestorLeadInteractionById(
  id: string,
  updates: Partial<{
    type: (typeof investorInteractions.$inferSelect)["type"];
    notes: string | null;
    outcome: string | null;
  }>,
) {
  await db
    .update(investorInteractions)
    .set(updates)
    .where(eq(investorInteractions.id, id));
}

export async function deleteInvestorLeadInteractionById(id: string) {
  await db.delete(investorInteractions).where(eq(investorInteractions.id, id));
}

export async function updateInvestorLeadById(
  id: string,
  updates: Partial<typeof investorLeads.$inferInsert>,
) {
  await db.update(investorLeads).set(updates).where(eq(investorLeads.id, id));
}

export async function deleteInvestorLeadById(id: string) {
  await db.delete(investorLeads).where(eq(investorLeads.id, id));
}

export async function convertInvestorLeadToInvestorTx(input: {
  investorLeadId: string;
  investorValues: typeof investors.$inferInsert;
}) {
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .select()
      .from(investorLeads)
      .where(eq(investorLeads.id, input.investorLeadId))
      .limit(1);

    if (!lead) {
      throw new Error("Investor lead not found");
    }

    const [existingInvestor] = await tx
      .select()
      .from(investors)
      .where(eq(investors.firstSeenFromInvestorLeadId, input.investorLeadId))
      .limit(1);

    if (existingInvestor) {
      return { investorId: existingInvestor.id, alreadyConverted: true as const };
    }

    const [inserted] = await tx
      .insert(investors)
      .values(input.investorValues)
      .returning();

    if (!inserted) {
      throw new Error("Failed to create investor");
    }

    await tx
      .update(investorInteractions)
      .set({
        investorId: inserted.id,
        investorLeadId: null,
      })
      .where(eq(investorInteractions.investorLeadId, input.investorLeadId));

    return { investorId: inserted.id, alreadyConverted: false as const };
  });
}
