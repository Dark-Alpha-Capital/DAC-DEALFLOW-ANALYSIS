"use server";

import {
  addPocFormSchema,
  AddPocFormValues,
} from "@/components/forms/add-poc-form";
import db from "db";
import { User } from "@prisma/client";
import { withAuthServerAction } from "@/lib/withAuth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AddPoc = withAuthServerAction(
  async (user: User, values: AddPocFormValues, dealId: string) => {
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
  },
);

export default AddPoc;
