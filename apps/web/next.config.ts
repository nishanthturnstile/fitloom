import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: { incomingRequests: false },
  allowedDevOrigins: process.env.AUTH_BASE_URL
    ? [new URL(process.env.AUTH_BASE_URL).hostname]
    : [],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
