"use server";
import { getSession } from "@/lib/auth-server";
import db, { sims, eq } from "db";
import { del } from "@vercel/blob";

import { revalidatePath } from "next/cache";

const DeleteSimFromDB = async (
  cimId: string,
  dealId: string,
  fileUrl: string,
) => {
  try {
    const session = await getSession();

    if (!session) {
      return {
        type: "error",
        message: "User is not authenticated!!!!!",
      };
    }

    await del(fileUrl);

    await db.delete(sims).where(eq(sims.id, cimId));

    revalidatePath(`/raw-deals/${dealId}`);

    return {
      type: "success",
      message: "CIM deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting CIM: ", error);
    if (error instanceof Error) {
      return {
        type: "error",
        message: `Failed to delete cim: ${error.message}`,
      };
    }

    return {
      type: "error",
      message: "Failed to delete cim. Please try again.",
    };
  }
};

export default DeleteSimFromDB;
