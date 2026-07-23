import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const wranglerConfigPath = path.join(appRoot, "wrangler.jsonc");

const repoPackages = [
  "@repo/db-tracker",
  "@repo/ai-core",
  "@repo/schemas",
  "@repo/enums",
];

export default defineConfig({
  root: appRoot,
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    port: 3001,
    allowedHosts: [
      ".trycloudflare.com",
      "tracker.darkalphacapital.com",
      "projects.darkalphacapital.com",
    ],
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
    exclude: ["@repo/db-tracker"],
  },
});
