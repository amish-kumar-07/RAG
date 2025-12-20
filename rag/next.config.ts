import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  paths: {
    "@/*": ["./*"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
