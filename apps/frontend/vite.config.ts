import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";


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

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: { port: 3000 },
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }),
  tanstackStart(), tailwindcss(), viteReact(), tsconfigPaths()],
  ssr: {
    noExternal: repoPackages,
  },
  optimizeDeps: {
    exclude: ["@repo/db"],
    include: ["buffer"],
  },
});
