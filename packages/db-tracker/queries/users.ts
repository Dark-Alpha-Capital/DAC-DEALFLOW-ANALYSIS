import { asc } from "drizzle-orm";
import { db } from "..";
import { users } from "../schema";

export type MemberRecord = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

/** All workspace users — used to populate assignee / lead pickers. */
export async function listMembers(): Promise<MemberRecord[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .orderBy(asc(users.name));

  return rows;
}
