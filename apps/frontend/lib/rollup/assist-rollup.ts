import { Pinecone } from "@pinecone-database/pinecone";

interface RollupCriteria {
  industry?: string;
  location?: string;
  revenueMin?: number;
  revenueMax?: number;
  ebitdaMarginMin?: number;
  ebitdaMarginMax?: number;
  businessStrategy?: string[];
}

export async function searchRollupCandidates(criteria: RollupCriteria) {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const namespace = pc.index("dac-deals", process.env.PINECONE_INDEX_HOST).namespace("initial");

  const queryText = [
    criteria.industry && `Industry: ${criteria.industry}`,
    criteria.location && `Location: ${criteria.location}`
  ].filter(Boolean).join("; ");

  // Build metadata filter for hard constraints
  const filter: Record<string, any> = {};
  if (criteria.revenueMin !== undefined) filter.revenue = { ...(filter.revenue || {}), $gte: criteria.revenueMin };
  if (criteria.revenueMax !== undefined) filter.revenue = { ...(filter.revenue || {}), $lte: criteria.revenueMax };
  if (criteria.ebitdaMarginMin !== undefined)
    filter.ebitdaMargin = { ...(filter.ebitdaMargin || {}), $gte: criteria.ebitdaMarginMin };
  if (criteria.ebitdaMarginMax !== undefined)
    filter.ebitdaMargin = { ...(filter.ebitdaMargin || {}), $lte: criteria.ebitdaMarginMax };
  if (criteria.businessStrategy && criteria.businessStrategy.length > 0)
    filter.business_strategy = { $in: criteria.businessStrategy };

  const response = await namespace.searchRecords({
    query: {
      topK: 5,
      inputs: { text: queryText },
      filter
    },
  });

  return response.result.hits.map((hit: any) => ({
    id: hit._id,
    score: hit._score,
    title: hit.fields.title,
    ebitda: hit.fields.ebitda,
    revenue: hit.fields.revenue,
    companyLocation: hit.fields.companyLocation,
    ebitdaMargin: hit.fields.ebitdaMargin,
  }));
}