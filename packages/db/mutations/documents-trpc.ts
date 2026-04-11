import { db } from "..";
import { documents } from "../schema";
import { and, eq } from "drizzle-orm";

export async function findDocumentDuplicateForCheck(input: {
  scopeType: "GLOBAL" | "ENTITY";
  contentHash: string;
  entityType?: "COMPANY" | "LEAD" | "DEAL_OPPORTUNITY" | "THEME";
  entityId?: string;
}) {
  const where =
    input.scopeType === "GLOBAL"
      ? and(
          eq(documents.entityType, "GLOBAL"),
          eq(documents.contentHash, input.contentHash),
        )
      : and(
          eq(documents.contentHash, input.contentHash),
          input.entityType === "COMPANY"
            ? eq(documents.companyId, input.entityId!)
            : input.entityType === "LEAD"
              ? eq(documents.leadId, input.entityId!)
              : input.entityType === "DEAL_OPPORTUNITY"
                ? eq(documents.dealOpportunityId, input.entityId!)
                : eq(documents.themeId, input.entityId!),
        );

  const [existingDocument] = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      entityType: documents.entityType,
      entityId: documents.entityId,
    })
    .from(documents)
    .where(where)
    .limit(1);

  return existingDocument ?? null;
}

export async function findDocumentByContentHashForEntity(input: {
  contentHash: string;
  entityType: "COMPANY" | "LEAD" | "DEAL_OPPORTUNITY" | "THEME";
  entityId: string;
}) {
  const entityPredicate =
    input.entityType === "COMPANY"
      ? eq(documents.companyId, input.entityId)
      : input.entityType === "LEAD"
        ? eq(documents.leadId, input.entityId)
        : input.entityType === "DEAL_OPPORTUNITY"
          ? eq(documents.dealOpportunityId, input.entityId)
          : eq(documents.themeId, input.entityId);

  const [existingDocument] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.contentHash, input.contentHash), entityPredicate))
    .limit(1);

  return existingDocument ?? null;
}

export async function findGlobalDocumentByContentHash(contentHash: string) {
  const [row] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(eq(documents.entityType, "GLOBAL"), eq(documents.contentHash, contentHash)),
    )
    .limit(1);
  return row ?? null;
}

export async function insertDocumentRow(
  values: typeof documents.$inferInsert,
) {
  const [row] = await db.insert(documents).values(values).returning({ id: documents.id });
  return row ?? null;
}

export async function updateDocumentById(
  documentId: string,
  updateData: Record<string, unknown>,
) {
  await db.update(documents).set(updateData).where(eq(documents.id, documentId));
}

export async function getDocumentFileMetaForDelete(documentId: string) {
  const [doc] = await db
    .select({
      fileUrl: documents.fileUrl,
      entityType: documents.entityType,
      entityId: documents.entityId,
      companyId: documents.companyId,
      dealOpportunityId: documents.dealOpportunityId,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  return doc ?? null;
}

export async function deleteDocumentById(documentId: string) {
  await db.delete(documents).where(eq(documents.id, documentId));
}
