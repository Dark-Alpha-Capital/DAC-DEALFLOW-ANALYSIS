"use server";

import { DeletePOCById } from "db/mutations";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

const deletePoc = async (pocId: string, dealId: string) => {
  const session = await getSession();
  if (!session) {
    return {
      type: "error",
      message: "Unauthorized",
    };
  }

  if (!pocId) {
    return {
      type: "error",
      message: "POC ID is required",
    };
  }

  if (!dealId) {
    return {
      type: "error",
      message: "Deal ID is required",
    };
  }

  try {
    const poc = await DeletePOCById(pocId);

    revalidatePath(`/raw-deals/${dealId}`);
    revalidatePath(`/manual-deals/${dealId}`);

    return {
      type: "success",
      message: "POC deleted successfully.",
    };
  } catch (error) {
    console.error("Error deleting POC:", error);
    return {
      type: "error",
      message: "Failed to delete POC. Please try again.",
    };
  }
};

export default deletePoc;
