"use server";

import { AddPocFormValues } from "@/components/forms/add-poc-form";
import db, { pocs } from "db";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

const AddPoc = async (values: AddPocFormValues, dealId: string) => {
  const session = await getSession();
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
    const [newPoc] = await db.insert(pocs).values({
      name: values.name,
      email: values.email,
      workPhone: values.workPhone,
      dealId,
    }).returning();

    revalidatePath(`/raw-deals/${dealId}`);
    revalidatePath(`/manual-deals/${dealId}`);

    return {
      type: "success",
      message: "POC added successfully.",
      poc: newPoc,
    };
  } catch (error) {
    console.error("Error adding POC:", error);
    return {
      type: "error",
      message: "Failed to add POC. Please try again.",
    };
  }
};

export default AddPoc;
