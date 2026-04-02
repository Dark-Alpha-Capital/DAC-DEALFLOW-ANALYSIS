import { createServerFn } from "@tanstack/react-start";
import db, { deals, eq } from "@repo/db";

export const loadDealTagsRouteData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
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
