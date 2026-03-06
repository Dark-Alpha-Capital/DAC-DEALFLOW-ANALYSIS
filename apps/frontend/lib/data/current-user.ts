// helper function to get the current User

import db, { users, eq } from "@repo/db";

/**
 * get the current user by using their id
 *
 * @param userId - the id of the user
 * @returns the user object
 */
export async function getCurrentUserById(userId: string) {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return existingUser ?? null;
  } catch (error) {
    console.log("an error occured while trying to get current user");
    return null;
  }
}

/**
 * get the current user by using their email
 *
 * @param userEmail - the email of the user
 * @returns the user object
 */
export async function getCurrentUserByEmail(userEmail: string) {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    return existingUser ?? null;
  } catch (error) {
    console.log("an error occured while trying to get current user");
    return null;
  }
}
