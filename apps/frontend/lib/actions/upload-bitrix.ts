import type { Deal } from "@repo/db/schema";
import {
  buildCrmDealFieldsFromLegacyRawDeal,
  callBitrix,
} from "@repo/bitrix-sync";
import { createServerFn } from "@tanstack/react-start";
import { revalidatePath } from "@/lib/cache-invalidation";

async function exportDealToBitrixImpl(deal: Deal) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { auth } = await import("@/auth");
  const request = getRequest();
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  const categoryId = process.env.BITRIX_DEAL_CATEGORY_ID?.trim();
  const stageId = process.env.BITRIX_DEFAULT_STAGE_ID?.trim();

  const fields = buildCrmDealFieldsFromLegacyRawDeal(
    {
      id: deal.id,
      dealCaption: deal.dealCaption,
      revenue: Number(deal.revenue),
      sourceWebsite: deal.sourceWebsite,
      companyLocation: deal.companyLocation,
      firstName: deal.firstName,
      lastName: deal.lastName,
      email: deal.email,
      linkedinUrl: deal.linkedinUrl,
      workPhone: deal.workPhone,
      industry: deal.industry,
      ebitda: deal.ebitda,
      ebitdaMargin: deal.ebitdaMargin,
      askingPrice: deal.askingPrice,
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
  .inputValidator((deal: unknown) => deal as Deal)
  .handler(async ({ data: deal }) => exportDealToBitrixImpl(deal));
