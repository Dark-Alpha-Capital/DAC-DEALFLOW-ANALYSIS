"use server";

import { DeleteDealById } from "db/mutations";
import { DealType } from "db";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

const DeleteDealFromDB = async (dealType: DealType, dealId: string) => {
  const session = await getSession();
  if (!session) {
    return {
      type: "error",
      message: "Unauthorized",
    };
  }

  if ((session.user as any).role !== "ADMIN") {
    return {
      type: "error",
      message: "You are not authorized to delete this deal",
    };
  }

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
