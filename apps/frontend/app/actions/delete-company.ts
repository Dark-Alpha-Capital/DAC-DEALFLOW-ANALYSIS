"use server";

import prismaDB from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

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

  try {
    // Check if company exists
    const company = await prismaDB.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return {
        type: "error",
        message: "Company not found",
      };
    }

    // Delete the company (this will cascade delete related records)
    await prismaDB.company.delete({
      where: { id: companyId },
    });

    // Revalidate relevant paths
    revalidatePath("/companies");
    revalidatePath("/due-diligence");

    return {
      type: "success",
      message: `Company "${company.name}" deleted successfully`,
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
