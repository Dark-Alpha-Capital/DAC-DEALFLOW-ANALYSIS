import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import db, { users, accounts, eq } from "@repo/db";

export const loadProfileRouteData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    const profileUid = data.uid;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, profileUid))
      .limit(1);

    if (!user) {
      throw notFound();
    }

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, profileUid));

    return { userWithAccounts: { ...user, accounts: userAccounts } };
  });
