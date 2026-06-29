import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ["fs", "path"],
  },
};

export default nextConfig;
