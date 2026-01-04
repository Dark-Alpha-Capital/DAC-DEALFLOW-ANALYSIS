"use server";

import db, { rollups, deals, users, usersToRollups, eq } from "db";
import { getSession } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

/**
 * Delete a rollup (Admin only)
 * @param rollupId - the id of the rollup to delete
 * @returns success status
 */
export async function deleteRollup(rollupId: string) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    if ((session.user as any).role !== "ADMIN") {
      return { success: false, error: "Only admins can delete rollups" };
    }

    await db.delete(rollups).where(eq(rollups.id, rollupId));

    revalidatePath("/rollups");
    return { success: true };
  } catch (error) {
    console.error("Error deleting rollup", error);
    return { success: false, error: "Failed to delete rollup" };
  }
}

/**
 * Update a rollup
 * @param rollupId - the id of the rollup to update
 * @param data - the data to update
 * @returns success status and updated rollup
 */
export async function updateRollup(
  rollupId: string,
  data: {
    name?: string;
    description?: string;
    summary?: string;
  },
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const [updated] = await db.update(rollups).set(data).where(eq(rollups.id, rollupId)).returning();

    // Fetch related users and deals
    const rollupUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(usersToRollups)
      .innerJoin(users, eq(usersToRollups.userId, users.id))
      .where(eq(usersToRollups.rollupId, rollupId));

    const rollupDeals = await db.select().from(deals).where(eq(deals.rollupId, rollupId));

    const updatedRollup = { ...updated, users: rollupUsers, deals: rollupDeals };

    revalidatePath("/rollups");
    revalidatePath(`/rollups/${rollupId}`);
    return { success: true, rollup: updatedRollup };
  } catch (error) {
    console.error("Error updating rollup", error);
    return { success: false, error: "Failed to update rollup" };
  }
}

/**
 * Update deal within a rollup
 * @param dealId - the id of the deal to update
 * @param data - the data to update
 * @returns success status
 */
export async function updateDealInRollup(
  dealId: string,
  data: {
    chunk_text?: string;
    description?: string;
  },
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await db.update(deals).set(data).where(eq(deals.id, dealId));

    revalidatePath("/rollups");
    return { success: true };
  } catch (error) {
    console.error("Error updating deal", error);
    return { success: false, error: "Failed to update deal" };
  }
}

/**
 * Remove a deal from a rollup
 * @param dealId - the id of the deal to remove
 * @param rollupId - the id of the rollup
 * @returns success status
 */
export async function removeDealFromRollup(dealId: string, rollupId: string) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    if ((session.user as any).role !== "ADMIN") {
      return { success: false, error: "Only admins can remove deals" };
    }

    await db.update(deals).set({ rollupId: null }).where(eq(deals.id, dealId));

    revalidatePath("/rollups");
    revalidatePath(`/rollups/${rollupId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing deal from rollup", error);
    return { success: false, error: "Failed to remove deal" };
  }
}
