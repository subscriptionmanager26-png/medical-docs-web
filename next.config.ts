import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "googleapis",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
