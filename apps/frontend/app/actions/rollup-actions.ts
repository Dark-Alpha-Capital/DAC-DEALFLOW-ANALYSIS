"use server";

import prismaDB from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/**
 * Delete a rollup (Admin only)
 * @param rollupId - the id of the rollup to delete
 * @returns success status
 */
export async function deleteRollup(rollupId: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return { success: false, error: "Only admins can delete rollups" };
    }

    await prismaDB.rollup.delete({
      where: { id: rollupId },
    });

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
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const updatedRollup = await prismaDB.rollup.update({
      where: { id: rollupId },
      data,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        deals: true,
      },
    });

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
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    await prismaDB.deal.update({
      where: { id: dealId },
      data,
    });

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
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return { success: false, error: "Only admins can remove deals" };
    }

    await prismaDB.deal.update({
      where: { id: dealId },
      data: { rollupId: null },
    });

    revalidatePath("/rollups");
    revalidatePath(`/rollups/${rollupId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing deal from rollup", error);
    return { success: false, error: "Failed to remove deal" };
  }
}
