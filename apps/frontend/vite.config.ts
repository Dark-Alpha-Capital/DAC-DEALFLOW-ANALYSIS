import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const repoPackages = [
  "@repo/db",
  "@repo/deal-screening",
  "@repo/nextcloud",
  "@repo/rag-engine",
  "@repo/ai-core",
  "@repo/redis-queue",
  "@repo/schemas",
  "types",
];

const postgresBrowserStub = path.resolve(
  __dirname,
  "src/stubs/postgres-browser-stub.ts",
);

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: { port: 3000 },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  plugins: [
    {
      name: "postgres-stub-client-only",
      enforce: "pre",
      resolveId(source: string) {
        if (
          source === "postgres" &&
          (this as unknown as { environment?: { name?: string } }).environment
            ?.name === "client"
        ) {
          return postgresBrowserStub;
        }
        return undefined;
      },
    },
    tanstackStart(),
    tailwindcss(),
    viteReact(),
    tsconfigPaths(),
  ],
  ssr: {
    noExternal: repoPackages,
  },
  optimizeDeps: {
    exclude: ["@repo/db"],
    include: ["buffer"],
  },
});
