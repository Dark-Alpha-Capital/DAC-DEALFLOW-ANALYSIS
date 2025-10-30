"use server";

// lib/bitrix.js
import axios from "axios";
import { Deal } from "db";
import { auth } from "@/auth";
import db from "db";
import { revalidatePath } from "next/cache";

/**
 * Exports a deal to Bitrix24 using the CRM API.
 *
 * @param {Object} deal - The deal object from your application.
 * @returns {Promise<Object>} - The response from Bitrix24 API.
 */
const exportDealToBitrix = async (deal: Deal) => {
  const session = await auth();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  const rawFields = {
    // Standard field: Deal name
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
      deal.askingPrice != null && !isNaN(deal.askingPrice as any)
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
      await db.deal.update({
        where: { id: deal.id },
        data: {
          bitrixId: responseData.result.toString(),
          bitrixCreatedAt: new Date(),
        },
      });
    }

    revalidatePath(`/raw-deals/${deal.id}`);
    revalidatePath(`/raw-deals`);

    return response.data;
  } catch (error: any) {
    console.error(
      "Error exporting deal to Bitrix24:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export { exportDealToBitrix };
