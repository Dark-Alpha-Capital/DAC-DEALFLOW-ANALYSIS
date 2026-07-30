import { createServerFn } from "@tanstack/react-start";
import db, { deals, eq } from "@repo/db";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { uidParamSchema } from "@/lib/server/server-fn-input-schemas";

export const loadDealTagsRouteData = createServerFn({ method: "GET" })
  .validator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const dealUid = data.uid;
    const [fetchedDealTags] = await db
      .select({ tags: deals.tags })
      .from(deals)
      .where(eq(deals.id, dealUid))
      .limit(1);
    return {
      dealUid,
      existingTags: fetchedDealTags?.tags ?? [],
    };
  });
