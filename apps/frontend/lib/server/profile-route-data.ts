import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import db, { users, accounts, eq } from "@repo/db";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { uidParamSchema } from "@/lib/server/server-fn-input-schemas";

export const loadProfileRouteData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
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
