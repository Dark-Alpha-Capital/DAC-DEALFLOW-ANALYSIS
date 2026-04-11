import { db } from "..";
import { companyNotes } from "../schema";
import { desc, eq } from "drizzle-orm";

export async function listCompanyNotesByCompanyId(companyId: string) {
  return db
    .select()
    .from(companyNotes)
    .where(eq(companyNotes.companyId, companyId))
    .orderBy(desc(companyNotes.createdAt));
}

export async function insertCompanyNote(input: {
  companyId: string;
  title?: string | null;
  content: string;
  createdById: string;
}) {
  const [note] = await db
    .insert(companyNotes)
    .values({
      companyId: input.companyId,
      title: input.title ?? null,
      content: input.content,
      createdById: input.createdById,
    })
    .returning();
  return note ?? null;
}

export async function updateCompanyNoteById(input: {
  id: string;
  title?: string | null;
  content: string;
}) {
  const [updated] = await db
    .update(companyNotes)
    .set({
      title: input.title ?? null,
      content: input.content,
    })
    .where(eq(companyNotes.id, input.id))
    .returning();
  return updated ?? null;
}

export async function deleteCompanyNoteById(id: string) {
  const [deleted] = await db
    .delete(companyNotes)
    .where(eq(companyNotes.id, id))
    .returning();
  return deleted ?? null;
}
