import { db } from "..";
import { deals } from "../schema";
import type { DealType } from "../enums";

/** Legacy `deals` row for AI-inferred manual capture. */
export async function insertAiInferredDeal(input: {
  sourceWebsite: string;
  firstName: string;
  lastName: string;
  email: string;
  companyLocation: string;
  dealCaption: string;
  industry: string;
  askingPrice: number;
  revenue: number;
  grossRevenue: number;
  title: string;
  ebitda: number;
  ebitdaMargin: number;
  brokerage: string;
  dealType: DealType;
  userId: string;
}) {
  const [docRef] = await db.insert(deals).values(input).returning();
  return docRef ?? null;
}
