export {};

declare global {
  interface Window {
    BX24?: {
      init?: (callback: () => void) => void;
      getAuth?: () => unknown;
      getPlacement?: () => unknown;
      getLang?: () => unknown;
      placement?: {
        info?: (callback: (info: unknown) => void) => void;
        getOptions?: () => Record<string, unknown>;
      };
      callMethod?: (
        method: string,
        params: Record<string, unknown>,
        callback: (result: unknown) => void,
      ) => void;
    };
  }
}
