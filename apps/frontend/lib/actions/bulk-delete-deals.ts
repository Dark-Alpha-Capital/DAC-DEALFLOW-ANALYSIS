"use server";

import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { BulkDeleteDeals } from "db/mutations";

/**
 * Deletes several deals in one call.
 *
 * @param dealIds    Array of deal IDs (Prisma `id` column) to purge
 */
const BulkDeleteDealsFromDb = async (dealIds: string[]) => {
  try {
    const userSession = await getSession();
    if (!userSession || !userSession?.user) {
      return {
        type: "error",
        message: "You must be logged in to delete deals",
      };
    }

    await BulkDeleteDeals(dealIds);

    revalidatePath("/raw-deals");
    return {
      type: "success",
      message: "Deals deleted successfully",
    };
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
