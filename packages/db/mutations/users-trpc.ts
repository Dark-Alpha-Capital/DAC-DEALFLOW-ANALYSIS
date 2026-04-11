import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function listAllUsersForAdmin() {
  return db
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
}

export async function getUserRoleById(userId: string) {
  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));
  return row ?? null;
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  await db
    .update(users)
    .set({ isBlocked: blocked })
    .where(eq(users.id, userId));
}
