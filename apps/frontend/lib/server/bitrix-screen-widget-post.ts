import { getRequest } from "@tanstack/react-start/server";
import { extractBitrixDealIdFromFormData } from "@/lib/bitrix-placement-form";

export type BitrixScreenWidgetPostContext = {
  initialDealId: string | null;
  bitrixPlacement: string | null;
  postKeys: string[];
};

export async function loadBitrixScreenWidgetPostContext(): Promise<BitrixScreenWidgetPostContext> {
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
}
