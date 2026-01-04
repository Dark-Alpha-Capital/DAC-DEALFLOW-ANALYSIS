"use server";

import { getSession } from "@/lib/auth-server";
import db, { deals, eq } from "db";
import { revalidatePath } from "next/cache";

/**
 *
 *
 * this function is used to add tags to deal
 *
 * @param tags - The tags to save
 * @param dealUid - The UID of the deal to save the tags to
 */
export async function saveDealTags(tags: string[], dealUid: string) {
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

  console.log(tags);

  if (!tags || tags.length === 0) {
    console.log("Tags are not present", tags);
    return {
      success: false,
      message: "Tags are not present",
    };
  }

  try {
    await db.update(deals).set({
      tags: tags,
    }).where(eq(deals.id, dealUid));

    revalidatePath(`/raw-deals/${dealUid}`);
    revalidatePath(`/raw-deals`);

    return {
      success: true,
      message: "Deal was updated successfully",
    };
  } catch (error) {
    console.log("Error adding tags to deal", error);
    return {
      success: false,
      message: "Error adding tags to deal",
    };
  }
}
