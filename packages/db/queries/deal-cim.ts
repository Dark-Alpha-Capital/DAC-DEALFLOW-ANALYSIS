import { dealCims, cimExtractions, documents } from "../schema";
import { db } from "../index";
import { eq, and } from "drizzle-orm";

/**
 * Get active CIM upload row for a deal opportunity.
 */
export const getActiveCimForDeal = async (dealOpportunityId: string) => {
  const [row] = await db
    .select()
    .from(dealCims)
    .where(
      and(
        eq(dealCims.dealOpportunityId, dealOpportunityId),
        eq(dealCims.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return row ?? null;
};

/**
 * Get CIM extraction for the active DealCim of a deal opportunity.
 * Falls back to legacy extraction by dealOpportunityId if no active CIM row.
 */
export const GetCIMExtractionByDealOpportunityId = async (
  dealOpportunityId: string,
) => {
  try {
    const activeCim = await getActiveCimForDeal(dealOpportunityId);
    if (activeCim) {
      const [row] = await db
        .select({
          extraction: cimExtractions,
          documentFileName: documents.fileName,
          documentCreatedAt: documents.createdAt,
        })
        .from(cimExtractions)
        .innerJoin(dealCims, eq(cimExtractions.dealCimId, dealCims.id))
        .leftJoin(documents, eq(dealCims.documentId, documents.id))
        .where(eq(cimExtractions.dealCimId, activeCim.id))
        .limit(1);
      return row?.extraction
        ? {
            ...row.extraction,
            documentFileName: row.documentFileName,
            documentCreatedAt: row.documentCreatedAt,
          }
        : null;
    }
    const [legacyRow] = await db
      .select({
        extraction: cimExtractions,
        documentFileName: documents.fileName,
        documentCreatedAt: documents.createdAt,
      })
      .from(cimExtractions)
      .leftJoin(documents, eq(cimExtractions.documentId, documents.id))
      .where(eq(cimExtractions.dealOpportunityId, dealOpportunityId))
      .limit(1);
    return legacyRow?.extraction
      ? {
          ...legacyRow.extraction,
          documentFileName: legacyRow.documentFileName,
          documentCreatedAt: legacyRow.documentCreatedAt,
        }
      : null;
  } catch {
    return null;
  }
};
