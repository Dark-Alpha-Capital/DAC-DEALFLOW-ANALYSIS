import axios from "axios";
import type { Deal } from "@repo/db/schema";
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

  const rawFields = {
    TITLE: deal.dealCaption,
    OPPORTUNITY: Number(deal.revenue),
    UF_CRM_1715146259470: Number(deal.revenue),
    UF_CRM_1715146404315: deal.sourceWebsite,
    UF_CRM_1711453168658: deal.companyLocation,
    UF_CRM_FIRST_NAME: deal.firstName,
    UF_CRM_LAST_NAME: deal.lastName,
    UF_CRM_EMAIL: deal.email,
    UF_CRM_LINKEDIN_URL: deal.linkedinUrl,
    UF_CRM_WORK_PHONE: deal.workPhone,
    COMMENTS: `Industry: ${deal.industry} | EBITDA: ${deal.ebitda} | EBITDA Margin: ${deal.ebitdaMargin}`,
    ORIGINATOR_ID: "DARK_ALPHA_APP",
    ORIGIN_ID: deal.id.toString(),
    UF_CRM_1727869474151:
      deal.askingPrice != null && !isNaN(deal.askingPrice as number)
        ? {
            VALUE: Number(deal.askingPrice),
            CURRENCY: "USD",
          }
        : undefined,
  };

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([_, v]) => v !== undefined && v !== null),
  );

  console.log("fields", fields);

  const BITRIX_URL = process.env.BITRIX24_WEBHOOK;
  const endpoint = `${BITRIX_URL}/crm.deal.add.json`;

  try {
    const response = await axios.post(endpoint, { fields });
    console.log("Deal exported to Bitrix24:", response.data);

    const responseData = response.data as { result?: number };
    console.log("response data", responseData);

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

    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error(
      "Error exporting deal to Bitrix24:",
      err.response?.data || err.message,
    );
    throw error;
  }
}

export const exportDealToBitrix = createServerFn({ method: "POST" })
  .inputValidator((deal: unknown) => deal as Deal)
  .handler(async ({ data: deal }) => exportDealToBitrixImpl(deal));
