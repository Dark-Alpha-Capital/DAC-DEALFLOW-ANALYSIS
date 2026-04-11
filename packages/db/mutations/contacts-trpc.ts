import { db } from "..";
import { contacts } from "../schema";
import { and, eq } from "drizzle-orm";

export async function listContactsByEntity(input: {
  entityType: (typeof contacts.$inferSelect)["entityType"];
  entityId: string;
}) {
  return db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.entityType, input.entityType),
        eq(contacts.entityId, input.entityId),
      ),
    );
}

export async function getContactById(id: string) {
  const [row] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id));
  return row ?? null;
}

export async function insertContact(values: {
  entityType: (typeof contacts.$inferSelect)["entityType"];
  entityId: string;
  companyId?: string | null;
  leadId?: string | null;
  dealOpportunityId?: string | null;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  role?: string | null;
}) {
  const [added] = await db.insert(contacts).values(values).returning();
  return added ?? null;
}

export async function updateContactById(
  id: string,
  values: {
    entityType: (typeof contacts.$inferSelect)["entityType"];
    entityId: string;
    companyId: string | null;
    leadId: string | null;
    dealOpportunityId: string | null;
    name: string;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    role?: string | null;
  },
) {
  await db.update(contacts).set(values).where(eq(contacts.id, id));
}

export async function deleteContactById(id: string) {
  await db.delete(contacts).where(eq(contacts.id, id));
}
