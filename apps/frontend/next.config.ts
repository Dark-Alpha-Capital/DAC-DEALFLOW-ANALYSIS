import { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  transpilePackages: ["db", "types", "better-auth"],

  reactCompiler: true,
  cacheComponents: true,
  output: "standalone",

  // Explicitly set Turbopack root to avoid lockfile confusion (dev only)
  // Turbopack is experimental and can cause issues in Docker builds
  turbopack:
    process.env.NODE_ENV === "development"
      ? {
          root: process.env.TURBOPACK_ROOT || path.resolve(__dirname, "../.."),
        }
      : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
