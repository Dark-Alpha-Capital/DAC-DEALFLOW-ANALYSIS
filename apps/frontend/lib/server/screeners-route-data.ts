import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  getAllScreeners,
  getScreenerWithQuestions,
} from "@repo/db/queries";

export const loadScreenersPageData = createServerFn({ method: "GET" }).handler(
  async () => {
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
  .inputValidator((raw: unknown) => raw as { uid: string })
  .handler(async ({ data }) => {
    const screener = await getScreenerWithQuestions(data.uid);
    if (!screener) {
      throw notFound();
    }
    return { screener };
  });
