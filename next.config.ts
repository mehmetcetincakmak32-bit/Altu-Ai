import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  serverExternalPackages: ["fs", "path"],
};

export default nextConfig;
