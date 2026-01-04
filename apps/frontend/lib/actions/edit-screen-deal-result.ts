"use server";

import { getSession } from "@/lib/auth-server";
import db, { DealType, aiScreenings, eq } from "db";
import { screenDealSchemaType } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

// this function will be used to edit the results of a Deal screened using AI
const editScreenDealResult = async (
  screeningId: string,
  dealId: string,
  values: screenDealSchemaType,
  dealType: DealType,
) => {
  try {
    const session = await getSession();

    if (!session) {
      return {
        type: "error",
        message: "User is not authenticated",
      };
    }

    if (!screeningId) {
      return {
        type: "error",
        message: "Screening Id not provided",
      };
    }

    if (!dealId) {
      return {
        type: "error",
        message: "DEAL Id not provided",
      };
    }

    if (!dealType) {
      return {
        type: "error",
        message: "DEAL Type not provided",
      };
    }

    await db.update(aiScreenings).set({
      ...values,
    }).where(eq(aiScreenings.id, screeningId));

    revalidatePath(`/raw-deals/${dealId}`);

    return {
      type: "success",
      message: "",
    };
  } catch (error) {
    console.log(error);
    return {
      type: "error",
      message: "Error Occured while editing screening result",
    };
  }
};

export default editScreenDealResult;
