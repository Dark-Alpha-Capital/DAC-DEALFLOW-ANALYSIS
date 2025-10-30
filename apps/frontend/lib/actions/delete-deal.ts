"use server";

import { DeleteDealById } from "db/mutations";
import { DealType } from "@prisma/client";

import { revalidatePath } from "next/cache";

const DeleteDealFromDB = async (dealType: DealType, dealId: string) => {
  try {
    await DeleteDealById(dealId);

    revalidatePath("/raw-deals");

    return {
      type: "success",
      message: "Deal deleted successfully",
    };
  } catch (error) {
    console.error("Error adding deal: ", error);
    if (error instanceof Error) {
      return {
        type: "error",
        message: `Failed to delete deal: ${error.message}`,
      };
    }

    return {
      type: "error",
      message: "Failed to delete deal. Please try again.",
    };
  }
};

export default DeleteDealFromDB;
