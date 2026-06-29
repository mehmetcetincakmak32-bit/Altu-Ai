import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
