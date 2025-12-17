import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  paths: {
    "@/*": ["./*"],
  },
};

export default nextConfig;
