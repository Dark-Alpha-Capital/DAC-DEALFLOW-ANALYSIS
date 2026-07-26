import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  getAllScreeners,
  getScreenerWithQuestions,
} from "@repo/db/queries";
import { assertAuthenticated } from "@/lib/server/assert-session";
import { uidParamSchema } from "@/lib/server/server-fn-input-schemas";

export const loadScreenersPageData = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAuthenticated();
    const screeners = (await getAllScreeners()) ?? [];
    const totalQuestions = screeners.reduce(
      (sum, screener) => sum + (screener.questionCount ?? 0),
      0,
    );
    const totalWeight = screeners.reduce(
      (sum, screener) => sum + (screener.totalWeight ?? 0),
      0,
    );
    return { screeners, totalQuestions, totalWeight };
  },
);

export const loadScreenerDetailData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => uidParamSchema.parse(raw))
  .handler(async ({ data }) => {
    await assertAuthenticated();
    const screener = await getScreenerWithQuestions(data.uid);
    if (!screener) {
      throw notFound();
    }
    return { screener };
  });
