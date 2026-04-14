import { useEffect, useMemo, useState } from "react";
import {
  extractDealIdFromPlacementInfo,
  extractDealIdFromReferrer,
} from "@/lib/bitrix-widget-client";

export type BitrixWidgetLoaderPost = {
  initialDealId: string | null;
  bitrixPlacement: string | null;
  postKeys: string[];
};

/**
 * Resolves Bitrix deal id from URL search, SSR POST (loader), then BX24 / referrer.
 */
export function useBitrixWidgetDealId(args: {
  searchDealId?: string;
  loader: BitrixWidgetLoaderPost;
}) {
  const { searchDealId, loader } = args;
  const [fromBitrixUi, setFromBitrixUi] = useState<string | undefined>();
  const [bitrixFrontendDebug, setBitrixFrontendDebug] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const bx = window.BX24;
    const base: Record<string, unknown> = {
      hasBX24: Boolean(bx),
      topIsSelf: window.top === window.self,
      referrer: document.referrer || null,
      search: window.location.search,
    };

    const collectBxMeta = (): Record<string, unknown> => {
      if (!bx) return base;
      let next: Record<string, unknown> = {
        ...base,
        bx24Keys: Object.keys(bx),
        hasPlacementInfo: typeof bx.placement?.info === "function",
        hasPlacementGetOptions: typeof bx.placement?.getOptions === "function",
      };
      for (const [key, fn] of [
        ["bx24GetAuth", bx.getAuth],
        ["bx24GetPlacement", bx.getPlacement],
        ["bx24GetLang", bx.getLang],
      ] as const) {
        if (typeof fn !== "function") continue;
        try {
          next = { ...next, [key]: fn() };
        } catch (e) {
          next = {
            ...next,
            [`${key}Error`]: e instanceof Error ? e.message : String(e),
          };
        }
      }
      return next;
    };

    const applyPlacementInfo = (info: unknown) => {
      const meta = collectBxMeta();
      const fromPlacement = extractDealIdFromPlacementInfo(info);
      const locked = Boolean(searchDealId || loader.initialDealId);
      if (!locked && fromPlacement) setFromBitrixUi(fromPlacement);
      else if (!locked) {
        const refId = extractDealIdFromReferrer();
        if (refId) setFromBitrixUi(refId);
      }
      setBitrixFrontendDebug({ ...meta, bx24PlacementInfo: info ?? null });
    };

    const run = () => {
      if (!bx) {
        setBitrixFrontendDebug(base);
        return;
      }
      try {
        if (typeof bx.placement?.getOptions === "function") {
          applyPlacementInfo({ options: bx.placement.getOptions() });
          return;
        }
        if (typeof bx.placement?.info === "function") {
          bx.placement.info((info: unknown) => applyPlacementInfo(info));
          return;
        }
        const locked = Boolean(searchDealId || loader.initialDealId);
        if (!locked) {
          const refId = extractDealIdFromReferrer();
          if (refId) setFromBitrixUi(refId);
        }
        setBitrixFrontendDebug(collectBxMeta());
      } catch (e) {
        setBitrixFrontendDebug({
          ...collectBxMeta(),
          bx24PlacementInfoError:
            e instanceof Error ? e.message : String(e),
        });
      }
    };

    if (bx && typeof bx.init === "function") {
      bx.init(() => run());
    } else {
      run();
    }
  }, [searchDealId, loader.initialDealId]);

  const effectiveDealId =
    searchDealId?.trim() ||
    loader.initialDealId?.trim() ||
    fromBitrixUi?.trim() ||
    undefined;

  const debugPayload = useMemo(
    () => ({
      effectiveDealId,
      server: {
        placement: loader.bitrixPlacement,
        postKeys: loader.postKeys,
        initialDealId: loader.initialDealId,
      },
      bitrixFrontend: bitrixFrontendDebug,
    }),
    [
      effectiveDealId,
      loader.bitrixPlacement,
      loader.postKeys,
      loader.initialDealId,
      bitrixFrontendDebug,
    ],
  );

  return { effectiveDealId, debugPayload };
}
