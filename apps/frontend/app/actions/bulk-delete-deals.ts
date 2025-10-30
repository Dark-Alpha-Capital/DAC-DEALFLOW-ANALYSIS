"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { BulkDeleteDeals } from "db/mutations";

/**
 * Deletes several deals in one call.
 *
 * @param dealIds    Array of deal IDs (Prisma `id` column) to purge
 */
const BulkDeleteDealsFromDb = async (dealIds: string[]) => {
  try {
    const userSession = await auth();
    if (!userSession || !userSession?.user) {
      return {
        type: "error",
        message: "You must be logged in to delete deals",
      };
    }

    const response = await BulkDeleteDeals(dealIds);
    if (response.type === "error") {
      return response;
    }

    revalidatePath("/raw-deals");
    return response;
  } catch (error) {
    console.error("Error deleting deals:", error);
    if (error instanceof Error) {
      return {
        type: "error",
        message: `Failed to delete deals: ${error.message}`,
      };
    }
    return {
      type: "error",
      message: "Failed to delete deals. Please try again.",
    };
  }
};

export default BulkDeleteDealsFromDb;
