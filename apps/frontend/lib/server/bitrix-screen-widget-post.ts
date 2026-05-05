import { createServerFn } from "@tanstack/react-start";
import { extractBitrixDealIdFromFormData } from "@/lib/bitrix-placement-form";
import { getRequest } from "@tanstack/react-start/server";

export type BitrixScreenWidgetPostContext = {
  initialDealId: string | null;
  bitrixPlacement: string | null;
  postKeys: string[];
  postAuth: {
    memberId: string | null;
    authId: string | null;
    appSid: string | null;
    domain: string | null;
  };
};

function pickFormString(formData: FormData, name: string): string | null {
  const v = formData.get(name);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Bitrix24 opens placement iframes with an HTTP POST to your handler URL (form
 * fields like PLACEMENT_OPTIONS)—it is not an outbound "call Bitrix API" choice.
 * This reads that incoming POST once; reloads are GET, so the client also uses
 * sessionStorage (see useBitrixWidgetDealId).
 */
export const loadBitrixScreenWidgetPostContext = createServerFn({
  method: "GET",
}).handler(async (): Promise<BitrixScreenWidgetPostContext> => {
  const request = getRequest();
  const empty: BitrixScreenWidgetPostContext = {
    initialDealId: null,
    bitrixPlacement: null,
    postKeys: [],
    postAuth: {
      memberId: null,
      authId: null,
      appSid: null,
      domain: null,
    },
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
      postAuth: {
        memberId: pickFormString(formData, "member_id"),
        authId: pickFormString(formData, "AUTH_ID"),
        appSid: pickFormString(formData, "APP_SID"),
        domain: pickFormString(formData, "DOMAIN"),
      },
    };
  } catch {
    return empty;
  }
});
