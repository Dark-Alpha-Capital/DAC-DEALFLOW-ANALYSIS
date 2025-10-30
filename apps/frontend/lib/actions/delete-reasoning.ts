"use server";

import { auth } from "@/auth";
import { DeleteReasoningById } from "db/mutations";
import { revalidatePath } from "next/cache";

export async function deleteReasoning(reasoningId: string, dealId: string) {
  const session = await auth();
  if (!session) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  if (!reasoningId) {
    console.log("reasoning id is not found");

    return {
      success: false,
      message: "Reasoning ID not found",
    };
  }

  try {
    await DeleteReasoningById(reasoningId);

    revalidatePath(`/raw-deals/${dealId}/reasonings`);

    return {
      success: true,
      message: "Reasoning deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting reasoning", error);
    return {
      success: false,
      message: "Error deleting reasoning",
    };
  }
}
