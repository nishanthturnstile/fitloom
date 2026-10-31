import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["nishanths-macbook-pro.tail30fb6a.ts.net"],
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
