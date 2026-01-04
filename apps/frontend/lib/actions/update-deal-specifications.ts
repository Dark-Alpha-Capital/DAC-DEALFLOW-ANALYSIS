"use server";

import { getSession } from "@/lib/auth-server";
import db, { deals, eq } from "db";
import {
  dealSpecificationsFormSchemaType,
  dealSpecificationsFormSchema,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";

export async function updateDealSpecificationsAction(
  values: dealSpecificationsFormSchemaType,
  dealUid: string,
) {
  const userSession = await getSession();

  if (!userSession) {
    return {
      success: false,
      message: "You are not authorized to add tags to this deal",
    };
  }

  if (!dealUid) {
    console.log("Deal uid is not present", dealUid);
    return {
      success: false,
      message: "Deal uid is not present",
    };
  }

  const validatedFields = dealSpecificationsFormSchema.safeParse(values);

  if (!validatedFields.success) {
    console.log("error in validating fields");
    return {
      success: false,
      message: "invalid fields",
    };
  }

  try {
    await db.update(deals).set({
      seen: validatedFields.data.seen,
      status: validatedFields.data.status,
      isReviewed: validatedFields.data.isReviewed,
      isPublished: validatedFields.data.isPublished,
    }).where(eq(deals.id, dealUid));

    revalidatePath(`/raw-deals/${dealUid}`);
    revalidatePath(`/raw-deals`);

    return {
      success: true,
      message: "Deal specifications updated successfully",
    };
  } catch (error) {
    console.log("error in updating deal specifications", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "error in updating deal specifications",
    };
  }
}
