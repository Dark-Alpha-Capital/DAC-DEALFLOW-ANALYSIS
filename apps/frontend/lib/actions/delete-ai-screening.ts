"use server";
import { DeleteReasoningById } from "db/mutations";
import { DealType } from "@prisma/client";

import { revalidatePath } from "next/cache";

const DeleteAIScreeningFromDB = async (screeningId: string, dealId: string) => {
  try {
    await DeleteReasoningById(screeningId);

    revalidatePath(`/raw-deals/${dealId}`);

    return {
      type: "success",
      message: "AI SCRENNING deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting AI SCRENNING: ", error);
    if (error instanceof Error) {
      return {
        type: "error",
        message: `Failed to delete AI SCRENNING: ${error.message}`,
      };
    }

    return {
      type: "error",
      message: "Failed to delete cim. Please try again.",
    };
  }
};

export default DeleteAIScreeningFromDB;
