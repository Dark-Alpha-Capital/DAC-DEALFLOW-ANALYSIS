import { TRPCError } from "@trpc/server";
import {
  getBitrixDealStages,
  getDefaultBitrixStageId,
} from "@repo/bitrix-sync";
import db, { eq } from "@repo/db";
import { dealOpportunities } from "@repo/db/schema";
import {
  insertDealOpportunityRow,
  updateDealOpportunityBitrixFields,
} from "@repo/db/mutations";
import { verifyBitrixAuthId } from "@/lib/server/bitrix-ai-widget-gate";
import { verifyBitrixWidgetSignature } from "@/lib/server/bitrix-widget-signature";

function defaultDealOpportunityStage(): string {
  return getDefaultBitrixStageId(getBitrixDealStages());
}

export async function assertValidBitrixWidgetContext(input: {
  dealId: string;
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
}) {
  if (input.memberId && input.expiresAt && input.authSig) {
    const verified = verifyBitrixWidgetSignature({
      dealId: input.dealId,
      memberId: input.memberId,
      expiresAt: input.expiresAt,
      authSig: input.authSig,
    });
    if (!verified.ok) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: verified.reason,
      });
    }
    return;
  }

  if (input.authId && input.domain) {
    const ok = await verifyBitrixAuthId(input.authId, input.domain);
    if (ok) return;
  }

  if (input.appSid && input.domain) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Missing widget auth. Provide signed params (memberId/expiresAt/authSig) or Bitrix AUTH_ID + DOMAIN.",
  });
}

export async function resolveDealOpportunityForBitrixDeal(bitrixDealId: string) {
  const [existing] = await db
    .select({ id: dealOpportunities.id })
    .from(dealOpportunities)
    .where(eq(dealOpportunities.bitrixId, bitrixDealId))
    .limit(1);
  if (existing?.id) return existing.id;

  const created = await insertDealOpportunityRow({
    companyId: null,
    leadId: null,
    sourceWebsite: null,
    brokerage: "Bitrix24",
    revenue: null,
    ebitda: null,
    ebitdaMargin: null,
    askingPrice: null,
    title: `Bitrix deal ${bitrixDealId}`,
    dealTeaser: `Imported from Bitrix deal ${bitrixDealId}`,
    description: null,
    brokerFirstName: null,
    brokerLastName: null,
    brokerEmail: null,
    brokerPhone: null,
    brokerLinkedIn: null,
    userId: null,
    stage: defaultDealOpportunityStage(),
  });
  if (!created?.id) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create deal mapping for Bitrix widget",
    });
  }
  await updateDealOpportunityBitrixFields(created.id, {
    bitrixId: bitrixDealId,
    bitrixLink: null,
    bitrixCreatedAt: new Date(),
  });
  return created.id;
}
