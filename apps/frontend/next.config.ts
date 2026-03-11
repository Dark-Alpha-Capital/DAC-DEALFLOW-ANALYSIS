import { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/deals", destination: "/deal-opportunities", permanent: true },
      {
        source: "/deals/:path*",
        destination: "/deal-opportunities/:path*",
        permanent: true,
      },
    ];
  },
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@repo/db", "types"],
  cacheComponents: true,
  output: "standalone",
  turbopack: {
    root: process.env.TURBOPACK_ROOT || path.resolve(__dirname, "../.."),
  },
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
