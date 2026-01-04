"use server";

import { NewDealFormSchemaType } from "@/components/forms/new-deal-form";
import db, { deals, DealType } from "db";
import { revalidatePath, updateTag } from "next/cache";
import { getSession } from "@/lib/auth-server";

const AddDealToDB = async (values: NewDealFormSchemaType) => {
  const session = await getSession();
  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  try {
    const [addedDeal] = await db
      .insert(deals)
      .values({
        title: values.title,
        dealCaption: values.deal_caption,
        firstName: values.first_name,
        lastName: values.last_name,
        email: values.email,
        linkedinUrl: values.linkedinurl,
        workPhone: values.work_phone,
        revenue: values.revenue,
        ebitda: values.ebitda,
        ebitdaMargin: values.ebitda_margin,
        grossRevenue: values.gross_revenue,
        companyLocation: values.company_location,
        brokerage: values.brokerage,
        sourceWebsite: values.source_website || "",
        industry: values.industry,
        askingPrice: values.asking_price,
        dealType: DealType.MANUAL,
        userId: session.user?.id,
      })
      .returning();

    revalidatePath(`/manual-deals`);
    updateTag("deals");

    return {
      dealId: addedDeal?.id,
      success: "Deal added successfully",
    };
  } catch (error) {
    console.error("Error adding deal: ", error);
    if (error instanceof Error) {
      return {
        error:
          error.message.length > 0
            ? error.message
            : "Failed to add the deal. Please try again.",
      };
    }

    return {
      error: "Failed to add the deal. Please try again.",
    };
  }
};

export default AddDealToDB;
