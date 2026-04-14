import { db } from "..";
import { leads, companies, dealOpportunities, leadScreenings } from "../schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function insertLeadRow(values: typeof leads.$inferInsert) {
  const [added] = await db.insert(leads).values(values).returning();
  return added ?? null;
}

export async function deleteLeadDeterministicScreening(leadId: string) {
  await db.delete(leadScreenings).where(eq(leadScreenings.leadId, leadId));
}

export async function updateLeadById(
  id: string,
  values: Partial<typeof leads.$inferInsert>,
) {
  await db
    .update(leads)
    .set(values)
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
}

export async function softDeleteLeadById(id: string) {
  await db
    .update(leads)
    .set({ deletedAt: new Date() })
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
}

export async function updateLeadRowById(id: string, payload: Partial<typeof leads.$inferInsert>) {
  await db.update(leads).set(payload).where(eq(leads.id, id));
}

export async function rejectLeadById(id: string) {
  await db
    .update(leads)
    .set({
      status: "REJECTED",
      duplicateCompanyId: null,
      processedAt: new Date(),
    })
    .where(and(eq(leads.id, id), isNull(leads.deletedAt)));
}

export async function markLeadDuplicateTx(input: { leadId: string; companyId: string }) {
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .select({
        id: leads.id,
        deletedAt: leads.deletedAt,
        processedAt: leads.processedAt,
      })
      .from(leads)
      .where(eq(leads.id, input.leadId))
      .limit(1);

    if (!lead || lead.deletedAt) {
      throw new Error("Lead not found");
    }

    const [company] = await tx
      .select({
        id: companies.id,
        deletedAt: companies.deletedAt,
      })
      .from(companies)
      .where(eq(companies.id, input.companyId))
      .limit(1);

    if (!company || company.deletedAt) {
      throw new Error("Company not found");
    }

    await tx
      .update(leads)
      .set({
        status: "DUPLICATE",
        duplicateCompanyId: company.id,
        processedAt: lead.processedAt ?? new Date(),
      })
      .where(eq(leads.id, lead.id));

    return { leadId: lead.id, companyId: company.id };
  });
}

export async function convertLeadToDealOpportunityTx(input: {
  leadId: string;
  defaultStage: string;
}) {
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .select()
      .from(leads)
      .where(and(eq(leads.id, input.leadId), isNull(leads.deletedAt)))
      .limit(1);

    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.status === "DUPLICATE" && lead.duplicateCompanyId) {
      throw new Error(
        "Lead is marked as duplicate. Clear duplicate status before converting.",
      );
    }

    const [existingOpp] = await tx
      .select({ id: dealOpportunities.id })
      .from(dealOpportunities)
      .where(eq(dealOpportunities.leadId, lead.id))
      .orderBy(
        desc(dealOpportunities.createdAt),
        desc(dealOpportunities.id),
      )
      .limit(1);

    const [createdOpp] = existingOpp
      ? [null]
      : await tx.insert(dealOpportunities)
        .values({
          companyId: null,
          leadId: lead.id,
          sourceWebsite: lead.sourceWebsite,
          brokerage: lead.brokerage,
          revenue: null,
          ebitda: null,
          askingPrice: null,
          dealTeaser: lead.rawTitle,
          description: lead.rawDescription,
          dealType: "MANUAL",
          stage: input.defaultStage,
        })
        .returning();

    if (lead.status !== "PROCESSED" || !lead.processedAt) {
      await tx
        .update(leads)
        .set({
          status: "PROCESSED",
          processedAt: lead.processedAt ?? new Date(),
          duplicateCompanyId: null,
        })
        .where(eq(leads.id, lead.id));
    }

    return {
      leadId: lead.id,
      companyId: null as string | null,
      dealOpportunityId: existingOpp?.id ?? createdOpp?.id ?? null,
      alreadyConverted: false,
      createdOpportunityFromLead: Boolean(createdOpp),
      leadRevenue: lead.revenue ?? null,
      leadEbitda: lead.ebitda ?? null,
      leadAskingPrice: lead.askingPrice ?? null,
    };
  });
}
