"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { DeleteCompanyById } from "db/mutations";

interface DeleteCompanyResult {
  type: "success" | "error";
  message: string;
}

const DeleteCompany = async (
  companyId: string,
): Promise<DeleteCompanyResult> => {
  const userSession = await auth();
  if (!userSession) {
    return {
      type: "error",
      message: "You are not logged in",
    };
  }

  if (!companyId) {
    return {
      type: "error",
      message: "Company id is not defined",
    };
  }

  try {
    await DeleteCompanyById(companyId);

    // Revalidate relevant paths
    revalidatePath("/companies");
    revalidatePath("/due-diligence");

    return {
      type: "success",
      message: `Company deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting company:", error);

    if (error instanceof Error) {
      return {
        type: "error",
        message: `Failed to delete company: ${error.message}`,
      };
    }

    return {
      type: "error",
      message: "Failed to delete company. Please try again.",
    };
  }
};

export default DeleteCompany;
