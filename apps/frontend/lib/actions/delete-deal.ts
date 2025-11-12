"use server";

import { DeleteDealById } from "db/mutations";
import { DealType } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

const DeleteDealFromDB = async (dealType: DealType, dealId: string) => {
  const session = await auth();
  if (!session) {
    return {
      type: "error",
      message: "Unauthorized",
    };
  }

  if (session.user.role !== "ADMIN") {
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
