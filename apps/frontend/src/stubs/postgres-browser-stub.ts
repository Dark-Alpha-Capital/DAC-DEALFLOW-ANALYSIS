/** Replaces `postgres` in the Vite *client* environment only (see vite.config.ts). */
export default function postgres(): never {
  throw new Error(
    "postgres: this module must not run in the browser. Use loaders/server functions or tRPC.",
  );
}
