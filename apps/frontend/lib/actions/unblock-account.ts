"use server";

import { getSession } from "@/lib/auth-server";
import getCurrentUserRole from "@/lib/data/current-user-role";
import db, { users, eq } from "db";
import { revalidatePath } from "next/cache";

const unblockAccount = async (userId: string) => {
  try {
    const session = await getSession();

    if (!session) throw new Error("Not Logged In");

    const currentUserRole = await getCurrentUserRole();

    if (currentUserRole !== "ADMIN") {
      throw new Error("Unauthorized");
    }

    await db.update(users).set({
      isBlocked: false,
    }).where(eq(users.id, userId));

    revalidatePath("/admin");

    return {
      type: "success",
      message: "Account Unblocked successfully",
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default unblockAccount;
