import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

/** Always resolve Wrangler + Vite root to this app (works when Turbo cwd differs). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const wranglerConfigPath = path.join(appRoot, "wrangler.jsonc");

const repoPackages = [
  "@repo/db",
  "@repo/bitrix-sync",
  "@repo/deal-screening",
  "@repo/nextcloud",
  "@repo/rag-engine",
  "@repo/cim-extraction",
  "@repo/ai-core",
  "@repo/redis-queue",
  "@repo/schemas",
  "types",
];

export default defineConfig({
  root: appRoot,
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    port: 3000,
    allowedHosts: [".trycloudflare.com", "dealflow.darkalphacapital.com"],
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
      remoteBindings: true,
      configPath: wranglerConfigPath,
    }),
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
