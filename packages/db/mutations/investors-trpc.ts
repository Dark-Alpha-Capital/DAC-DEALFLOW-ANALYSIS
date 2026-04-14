import { db } from "..";
import {
  investors,
  investorInteractions,
  investorCompanyLinks,
} from "../schema";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

export async function listInvestorsForSelect() {
  return db
    .select({ id: investors.id, name: investors.name })
    .from(investors)
    .orderBy(asc(investors.name));
}

export async function searchInvestorsForLink(input: {
  pattern: string;
  limit: number;
}) {
  return db
    .select({
      id: investors.id,
      name: investors.name,
      email: investors.email,
    })
    .from(investors)
    .where(
      or(ilike(investors.name, input.pattern), ilike(investors.email, input.pattern)),
    )
    .orderBy(asc(investors.name))
    .limit(input.limit);
}

export async function insertInvestor(values: typeof investors.$inferInsert) {
  const [added] = await db.insert(investors).values(values).returning();
  return added ?? null;
}

export async function updateInvestorById(
  id: string,
  values: Omit<Partial<typeof investors.$inferInsert>, "id">,
) {
  await db.update(investors).set(values).where(eq(investors.id, id));
}

export async function deleteInvestorById(id: string) {
  await db.delete(investors).where(eq(investors.id, id));
}

export async function findInvestorCompanyLinkDup(
  investorId: string,
  companyId: string,
) {
  const [dup] = await db
    .select({ id: investorCompanyLinks.id })
    .from(investorCompanyLinks)
    .where(
      and(
        eq(investorCompanyLinks.investorId, investorId),
        eq(investorCompanyLinks.companyId, companyId),
      ),
    )
    .limit(1);
  return dup ?? null;
}

export async function insertInvestorCompanyLink(values: typeof investorCompanyLinks.$inferInsert) {
  await db.insert(investorCompanyLinks).values(values);
}

export async function updateInvestorCompanyLinkById(
  linkId: string,
  updates: { notes?: string | null; status?: "ACTIVE" | "ARCHIVED" },
) {
  const [row] = await db
    .update(investorCompanyLinks)
    .set(updates)
    .where(eq(investorCompanyLinks.id, linkId))
    .returning();
  return row ?? null;
}

export async function deleteInvestorCompanyLinkById(linkId: string) {
  const [row] = await db
    .delete(investorCompanyLinks)
    .where(eq(investorCompanyLinks.id, linkId))
    .returning();
  return row ?? null;
}

export async function listInvestorInteractions(investorId: string) {
  return db
    .select()
    .from(investorInteractions)
    .where(eq(investorInteractions.investorId, investorId))
    .orderBy(desc(investorInteractions.createdAt));
}

export async function insertInvestorInteraction(
  values: typeof investorInteractions.$inferInsert,
) {
  const [added] = await db.insert(investorInteractions)
    .values(values)
    .returning();
  return added ?? null;
}

export async function updateInvestorInteractionById(
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

export async function deleteInvestorInteractionById(id: string) {
  await db.delete(investorInteractions)
    .where(eq(investorInteractions.id, id));
}
