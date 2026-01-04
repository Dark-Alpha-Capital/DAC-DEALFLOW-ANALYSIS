"use server";

import { db } from "db";
import { users, UserRole } from "db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-server";

/**
 * Check if the current user is an admin
 */
async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id));

  return user?.role === UserRole.ADMIN;
}

/**
 * Block a user (admin only)
 */
export async function blockUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if current user is admin
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    // Get the user to be blocked
    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Prevent blocking admin users
    if (targetUser.role === UserRole.ADMIN) {
      return { success: false, error: "Cannot block admin users" };
    }

    // Block the user
    await db
      .update(users)
      .set({ isBlocked: true })
      .where(eq(users.id, userId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { success: false, error: "Failed to block user" };
  }
}

/**
 * Unblock a user (admin only)
 */
export async function unblockUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if current user is admin
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    // Unblock the user
    await db
      .update(users)
      .set({ isBlocked: false })
      .where(eq(users.id, userId));

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error unblocking user:", error);
    return { success: false, error: "Failed to unblock user" };
  }
}

/**
 * Get all users for admin table (admin only)
 */
export async function getUsers() {
  // Check if current user is admin
  if (!(await isAdmin())) {
    return [];
  }

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isBlocked: users.isBlocked,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return allUsers;
}
