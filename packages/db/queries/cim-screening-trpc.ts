import { db } from "../index";
import { documents, dealOpportunities } from "../schema";
import { eq } from "drizzle-orm";

export async function getLibraryDocumentByIdForCim(documentId: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  return row ?? null;
}

export async function getDealOpportunityBriefForCim(dealOpportunityId: string) {
  const [row] = await db
    .select({
      id: dealOpportunities.id,
      title: dealOpportunities.title,
      dealTeaser: dealOpportunities.dealTeaser,
      description: dealOpportunities.description,
    })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.id, dealOpportunityId))
    .limit(1);
  return row ?? null;
}
