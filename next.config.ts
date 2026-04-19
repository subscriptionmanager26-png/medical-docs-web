import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "googleapis"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
