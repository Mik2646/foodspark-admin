import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["192.168.1.84"],
  experimental: {
    serverBodySizeLimit: "20mb",
  },
};

export default nextConfig;
