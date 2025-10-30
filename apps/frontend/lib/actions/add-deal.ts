"use server";

import { NewDealFormSchemaType } from "@/components/forms/new-deal-form";
import db from "db";
import { withAuthServerAction } from "@/lib/withAuth";
import { DealType, User } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Adds a new deal to the database.
 *
 * This asynchronous function handles adding a new deal to the database based on values
 * validated by the `NewDealSchemaZodType` schema. It is intended for use in React applications
 * where form submissions are validated using Zod schemas before interacting with the database.
 *
 * @param {NewDealFormSchemaType} values - An object containing the form values that conform
 *                                         to the `NewDealFormSchemaType` schema. This includes
 *                                         all necessary fields and structure expected by the database.
 *
 * @returns {Promise<void>} Returns a promise that resolves once the deal has been added to the database.
 */
const AddDealToDB = withAuthServerAction(
  async (user: User, values: NewDealFormSchemaType) => {
    try {
      const addedDeal = await db.deal.create({
        data: {
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
          userId: user.id,
        },
      });

      revalidatePath(`/manual-deals`);

      return {
        dealId: addedDeal.id,
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
  },
);

export default AddDealToDB;
