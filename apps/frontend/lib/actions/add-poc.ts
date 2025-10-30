"use server";

import { AddPocFormValues } from "@/components/forms/add-poc-form";
import db from "db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const AddPoc = async (values: AddPocFormValues, dealId: string) => {
  const session = await auth();
  if (!session) {
    return {
      type: "error",
      message: "Unauthorized",
    };
  }

  if (!dealId) {
    return {
      type: "error",
      message: "Deal ID is required",
    };
  }

  try {
    const newPoc = await db.pOC.create({
      data: {
        name: values.name,
        email: values.email,
        workPhone: values.workPhone,
        dealId,
      },
    });

    revalidatePath(`/raw-deals/${dealId}`);
    revalidatePath(`/manual-deals/${dealId}`);

    return {
      type: "success",
      message: "POC added successfully.",
      poc: newPoc, // Optionally return the created POC
    };
  } catch (error) {
    console.error("Error adding POC:", error);
    // Check for specific Prisma errors if needed
    return {
      type: "error",
      message: "Failed to add POC. Please try again.",
    };
  }
};

export default AddPoc;
