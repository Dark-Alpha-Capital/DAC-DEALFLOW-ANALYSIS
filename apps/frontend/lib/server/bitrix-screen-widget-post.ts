import { createServerFn } from "@tanstack/react-start";
import { extractBitrixDealIdFromFormData } from "@/lib/bitrix-placement-form";

export type BitrixScreenWidgetPostContext = {
  initialDealId: string | null;
  bitrixPlacement: string | null;
  postKeys: string[];
};

/**
 * Reads Bitrix24's initial POST (PLACEMENT_OPTIONS, etc.) via the current request.
 * Exposed as a server function so the route loader matches the rest of the app
 * and stays out of the client bundle.
 */
export const loadBitrixScreenWidgetPostContext = createServerFn({
  method: "GET",
}).handler(async (): Promise<BitrixScreenWidgetPostContext> => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const empty: BitrixScreenWidgetPostContext = {
    initialDealId: null,
    bitrixPlacement: null,
    postKeys: [],
  };

  if (request.method !== "POST") {
    return empty;
  }

  try {
    const formData = await request.formData();
    const postKeys = [...new Set(formData.keys())];
    const parsed = extractBitrixDealIdFromFormData(formData);
    return {
      initialDealId: parsed.dealId,
      bitrixPlacement: parsed.placement,
      postKeys,
    };
  } catch {
    return empty;
  }
});
