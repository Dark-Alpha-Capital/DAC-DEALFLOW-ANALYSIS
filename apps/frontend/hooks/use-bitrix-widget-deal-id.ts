import { useEffect, useMemo, useState } from "react";
import {
  extractDealIdFromPlacementInfo,
  extractDealIdFromReferrer,
} from "@/lib/bitrix-widget-client";
import {
  mergeBitrixWidgetSearchWithSession,
  readBitrixWidgetSessionCache,
  writeBitrixWidgetSessionCache,
  type BitrixWidgetSearchFields,
  type BitrixWidgetSessionCacheV1,
} from "@/lib/bitrix-widget-session-cache";

export type BitrixWidgetLoaderPost = {
  initialDealId: string | null;
  bitrixPlacement: string | null;
  postKeys: string[];
};

export type BitrixWidgetWorkspaceInput = {
  memberId?: string;
  expiresAt?: number;
  authSig?: string;
  authId?: string;
  appSid?: string;
  domain?: string;
};

/**
 * URL → Bitrix POST body (loader) → BX24 placement → sessionStorage (reload / HMR).
 * Persists deal id + auth fields to sessionStorage once a deal id is known.
 */
export function useBitrixWidgetDealId(
  search: BitrixWidgetSearchFields,
  loader: BitrixWidgetLoaderPost,
) {
  const searchDealId = search.dealId;
  const [fromBitrixUi, setFromBitrixUi] = useState<string | undefined>();
  const [sessionRow, setSessionRow] = useState<BitrixWidgetSessionCacheV1 | null>(
    null,
  );

  useEffect(() => {
    setSessionRow(readBitrixWidgetSessionCache());
  }, []);

  const merged = useMemo(
    () => mergeBitrixWidgetSearchWithSession(search, sessionRow),
    [search, sessionRow],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bx = window.BX24;

    const applyPlacementInfo = (info: unknown) => {
      const fromPlacement = extractDealIdFromPlacementInfo(info);
      const locked = Boolean(searchDealId || loader.initialDealId);
      if (!locked && fromPlacement) setFromBitrixUi(fromPlacement);
      else if (!locked) {
        const refId = extractDealIdFromReferrer();
        if (refId) setFromBitrixUi(refId);
      }
    };

    const run = () => {
      if (!bx) {
        const locked = Boolean(searchDealId || loader.initialDealId);
        if (!locked) {
          const refId = extractDealIdFromReferrer();
          if (refId) setFromBitrixUi(refId);
        }
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
      } catch {
        /* placement optional */
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
    sessionRow?.dealId?.trim() ||
    undefined;

  const workspaceInput: BitrixWidgetWorkspaceInput = useMemo(
    () => ({
      memberId: merged.memberId,
      expiresAt: merged.expiresAt,
      authSig: merged.authSig,
      authId: merged.authId,
      appSid: merged.appSid,
      domain: merged.domain,
    }),
    [
      merged.memberId,
      merged.expiresAt,
      merged.authSig,
      merged.authId,
      merged.appSid,
      merged.domain,
    ],
  );

  useEffect(() => {
    const id = effectiveDealId?.trim();
    if (!id) return;
    writeBitrixWidgetSessionCache({
      dealId: id,
      memberId: merged.memberId,
      expiresAt: merged.expiresAt,
      authSig: merged.authSig,
      authId: merged.authId,
      appSid: merged.appSid,
      domain: merged.domain,
    });
  }, [
    effectiveDealId,
    merged.memberId,
    merged.expiresAt,
    merged.authSig,
    merged.authId,
    merged.appSid,
    merged.domain,
  ]);

  return { effectiveDealId, workspaceInput };
}
