import type { z } from "zod";
import {
  BITRIX_DEAL_PIPELINE_ID,
  buildCrmDealFieldsFromLegacyRawDeal,
  callBitrix,
} from "@repo/bitrix-sync";
import { createServerFn } from "@tanstack/react-start";
import { revalidatePath } from "@/lib/cache-invalidation";
import { getServerEnv } from "@/lib/env.server";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { exportDealToBitrixInputSchema } from "@/lib/server/server-fn-input-schemas";

type ExportDealInput = z.infer<typeof exportDealToBitrixInputSchema>;

async function exportDealToBitrixImpl(deal: ExportDealInput) {
  await assertAuthenticated();

  const env = getServerEnv();
  const categoryId = BITRIX_DEAL_PIPELINE_ID;
  const stageId = env.BITRIX_DEFAULT_STAGE_ID?.trim();

  const fields = buildCrmDealFieldsFromLegacyRawDeal(
    {
      id: deal.id,
      dealCaption: deal.dealCaption,
      revenue: Number(deal.revenue),
      sourceWebsite: deal.sourceWebsite,
      companyLocation: deal.companyLocation ?? null,
      firstName: deal.firstName ?? null,
      lastName: deal.lastName ?? null,
      email: deal.email ?? null,
      linkedinUrl: deal.linkedinUrl ?? null,
      workPhone: deal.workPhone ?? null,
      industry: deal.industry,
      ebitda: deal.ebitda,
      ebitdaMargin: deal.ebitdaMargin,
      askingPrice: deal.askingPrice ?? null,
    },
    {
      categoryId: categoryId || undefined,
      stageId: stageId || undefined,
    },
  );

  try {
    const result = await callBitrix<number>("crm.deal.add", { fields });
    const responseData = { result };

    if (responseData.result) {
      const { default: db, deals, eq } = await import("@repo/db");
      await db
        .update(deals)
        .set({
          bitrixId: responseData.result.toString(),
          bitrixCreatedAt: new Date(),
        })
        .where(eq(deals.id, deal.id));
    }

    revalidatePath(`/raw-deals/${deal.id}`);
    revalidatePath(`/raw-deals`);

    return responseData;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error exporting deal to Bitrix24:", err.message || error);
    throw error;
  }
}

export const exportDealToBitrix = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => exportDealToBitrixInputSchema.parse(raw))
  .handler(async ({ data: deal }) => exportDealToBitrixImpl(deal));
