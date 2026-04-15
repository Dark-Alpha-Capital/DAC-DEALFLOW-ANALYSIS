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

export async function getDealOpportunityScreeningContextRow(
  dealOpportunityId: string,
) {
  const [row] = await db
    .select({
      id: dealOpportunities.id,
      title: dealOpportunities.title,
      dealTeaser: dealOpportunities.dealTeaser,
      description: dealOpportunities.description,
      sourceWebsite: dealOpportunities.sourceWebsite,
      companyLocation: dealOpportunities.companyLocation,
      brokerage: dealOpportunities.brokerage,
      revenue: dealOpportunities.revenue,
      ebitda: dealOpportunities.ebitda,
      ebitdaMargin: dealOpportunities.ebitdaMargin,
      askingPrice: dealOpportunities.askingPrice,
      impliedMultiple: dealOpportunities.impliedMultiple,
      stage: dealOpportunities.stage,
      bitrixId: dealOpportunities.bitrixId,
      tags: dealOpportunities.tags,
    })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.id, dealOpportunityId))
    .limit(1);
  return row ?? null;
}

export type DealOpportunityScreeningContextRow = NonNullable<
  Awaited<ReturnType<typeof getDealOpportunityScreeningContextRow>>
>;

/** Plain-text block for the LLM: listing metadata stored on DealOpportunity (includes Bitrix-synced fields when present). */
export function formatDealOpportunityScreeningContext(
  row: DealOpportunityScreeningContextRow,
): string | null {
  const lines: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (typeof value === "number" && !Number.isFinite(value)) return;
    if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join(", ").trim();
      if (!joined) return;
      lines.push(`${label}: ${joined}`);
      return;
    }
    lines.push(`${label}: ${String(value).trim()}`);
  };
  push("Title", row.title);
  push("Teaser", row.dealTeaser);
  push("Description", row.description);
  push("Source / website", row.sourceWebsite);
  push("Location", row.companyLocation);
  push("Brokerage", row.brokerage);
  push("Revenue", row.revenue);
  push("EBITDA", row.ebitda);
  push("EBITDA margin", row.ebitdaMargin);
  push("Asking price", row.askingPrice);
  push("Implied multiple", row.impliedMultiple);
  push("Stage", row.stage);
  push("Bitrix deal ID", row.bitrixId);
  if (lines.length === 0) return null;
  return lines.join("\n");
}
